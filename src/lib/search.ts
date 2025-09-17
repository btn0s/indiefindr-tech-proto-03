import { embed, generateText } from "ai";
import fs from "fs";
import path from "path";
import { EnrichedTweet, GameData } from "./types";

const embeddingModel = "openai/text-embedding-3-small";

const loadEmbeddedData = async (): Promise<EnrichedTweet[]> => {
  const filePath = path.join(process.cwd(), "public/data/embed-results.json");
  const data = await fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
};

const cosineSimilarity = (a: number[], b: number[]): number => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

// Cache HyDE embeddings for deterministic behavior and lower latency
const hydeCache = new Map<string, number[]>();
// Cache reranker scores: key = query|appIdOrTitle
const rerankCache = new Map<string, number>();

export const searchGames = async (query: string): Promise<GameData[]> => {
  try {
    // Load embedded data
    const tweets = await loadEmbeddedData();

    // Generate embedding for the search query
    const { embedding: baseEmbedding } = await embed({
      model: embeddingModel,
      value: query,
    });

    // HyDE-style query expansion for short/ambiguous queries
    // For very short queries (<= 2 words), generate a brief descriptive expansion
    let queryEmbedding = baseEmbedding;
    const tokenCount = query.trim().split(/\s+/).filter(Boolean).length;
    if (tokenCount <= 2) {
      try {
        const cacheKey = query.trim().toLowerCase();
        let hydeEmbedding = hydeCache.get(cacheKey);
        if (!hydeEmbedding) {
          const { text: hypothetical } = await generateText({
            model: "openai/gpt-4o-mini",
            temperature: 0,
            system:
              "You expand ultra-short search queries into dense game descriptors for semantic search. Focus on gameplay intent and constraints. Prefer mechanics and modes over vibes. Keep under 24 words.",
            prompt: `User query: "${query}"\n
Return a single comma-separated descriptor covering:
- core mechanics (action verbs),
- play modes (single-player / co-op / online multiplayer / party),
- player count if implied,
- perspective (first-person / third-person / top-down / 2D),
- themes/setting (e.g., space exploration, sci‑fi),
- hard constraints (e.g., "social deduction", "no puzzle focus").

Examples:
- Query: "space" -> "space exploration, spaceship traversal, sci‑fi, galaxy setting, resource management, base building, systems simulation, no fantasy medieval"
- Query: "outer space" -> "outer space travel, spaceship combat, solar system exploration, sci‑fi, star systems, mining, stations, fleet management, no sports"
- Query: "among us" -> "social deduction, impostor vs crew, tasks and meetings, vote and accuse, online multiplayer party, 4–10 players, 2D top‑down, casual, no single‑player"

Now produce the descriptor for: ${query}`,
          });

          const { embedding } = await embed({
            model: embeddingModel,
            value: hypothetical.replaceAll("\n", " "),
          });
          hydeEmbedding = embedding;
          hydeCache.set(cacheKey, hydeEmbedding);
        }

        // Weighted blend (lean toward expanded intent for short queries)
        const hydeWeight = 0.65;
        const baseWeight = 0.35;
        queryEmbedding = baseEmbedding.map(
          (v, i) => baseWeight * v + hydeWeight * (hydeEmbedding![i] as number)
        );
      } catch {
        // Fall back to base embedding if HyDE expansion fails
        queryEmbedding = baseEmbedding;
      }
    }

    // Dynamic similarity threshold based on query length
    // Lower thresholds to match semantic image search approach (0.28)
    const threshold = query.length <= 5 ? 0.22 : 0.25;

    // Calculate similarities and collect candidates
    const candidates = tweets
      .filter((tweet) => tweet.steamProfiles && tweet.steamProfiles.length > 0)
      .flatMap((tweet) =>
        tweet.steamProfiles!.map((game): GameData => {
          const rawData = game.rawData;
          return {
            appId: game.appId,
            title: rawData.name,
            description: rawData.short_description,
            price:
              rawData.price_overview?.final_formatted ||
              (rawData.is_free ? "Free" : "N/A"),
            tags: rawData.genres?.map((g: any) => g.description) || [],
            releaseDate: rawData.release_date?.date || "",
            developer: rawData.developers?.join(", ") || "",
            publisher: rawData.publishers?.join(", ") || "",
            images: [
              rawData.header_image || "",
              ...(rawData.screenshots
                ?.slice(0, 4)
                .map((s: any) => s.path_full) || []),
            ].filter(Boolean),
            videos: [], // Video UI removed - Steam video URLs unreliable
            tweetId: tweet.id,
            tweetAuthor: tweet.author.userName,
            tweetText: tweet.fullText || tweet.text,
            aiMetadata: tweet.aiMetadata,
            tweetUrl: tweet.url,
            similarity: cosineSimilarity(queryEmbedding, tweet.embedding!),
          };
        })
      )
      .filter((item) => item.similarity && item.similarity > threshold);

    // Semantic ranking (higher is better)
    const semRanked = [...candidates].sort(
      (a, b) => (b.similarity || 0) - (a.similarity || 0)
    );

    // Lexical ranking: simple term overlap over title/description/tags/AI metadata
    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

    const lexicalScore = (g: GameData): number => {
      const textParts = [
        g.title,
        g.description,
        ...(g.tags || []),
        ...((g.aiMetadata?.genres as string[]) || []),
        ...((g.aiMetadata?.coreMechanics as string[]) || []),
      ]
        .filter(Boolean)
        .map((t) => String(t).toLowerCase())
        .join(" \n ");
      let score = 0;
      for (const term of queryTerms) {
        if (!term) continue;
        const re = new RegExp(
          `\\b${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`,
          "g"
        );
        const matches = textParts.match(re);
        score += matches ? matches.length : 0;
      }
      return score;
    };

    const withLex = candidates.map((g) => ({ g, ls: lexicalScore(g) }));
    const lexRanked = withLex.sort((a, b) => b.ls - a.ls).map((x) => x.g);

    // Reciprocal Rank Fusion (RRF) without manual boosts
    const rrfK = 60;
    const rankMap = (arr: GameData[]) => {
      const m = new Map<string, number>();
      arr.forEach((g, idx) => {
        const key = g.appId ? String(g.appId) : g.title.toLowerCase();
        if (!m.has(key)) m.set(key, idx + 1);
      });
      return m;
    };

    const semRanks = rankMap(semRanked);
    const lexRanks = rankMap(lexRanked);

    const allKeys = new Set<string>([...semRanks.keys(), ...lexRanks.keys()]);

    const byKey = new Map<string, GameData>();
    [...semRanked, ...lexRanked].forEach((g) => {
      const key = g.appId ? String(g.appId) : g.title.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, g);
    });

    const fused = [...allKeys].map((key) => {
      const r1 = semRanks.get(key);
      const r2 = lexRanks.get(key);
      const score = (r1 ? 1 / (rrfK + r1) : 0) + (r2 ? 1 / (rrfK + r2) : 0);
      return { key, score, g: byKey.get(key)! };
    });

    // Sort by fused score desc, then semantic similarity, then stable key
    fused.sort((a, b) => {
      const byScore = b.score - a.score;
      if (byScore !== 0) return byScore;
      const bySim = (b.g.similarity || 0) - (a.g.similarity || 0);
      if (bySim !== 0) return bySim;
      return a.key.localeCompare(b.key);
    });

    // De-duplicate by key and take top N for reranking
    const prelim: GameData[] = [];
    const seen = new Set<string>();
    for (const { key, g } of fused) {
      if (seen.has(key)) continue;
      seen.add(key);
      prelim.push(g);
      if (prelim.length >= 40) break; // rerank top-40
    }

    // LLM reranker (deterministic, cached)
    const rerankThreshold = 0.4;
    const scored: { g: GameData; s: number }[] = [];
    for (const g of prelim) {
      const k = `${query.trim().toLowerCase()}|${
        g.appId ? String(g.appId) : g.title.toLowerCase()
      }`;
      let s = rerankCache.get(k);
      if (s === undefined) {
        const text = [
          `Query: ${query}`,
          `Title: ${g.title}`,
          `Description: ${g.description || ""}`,
          `Tags: ${(g.tags || []).join(", ")}`,
          `Genres: ${((g.aiMetadata?.genres as string[]) || []).join(", ")}`,
          `Mechanics: ${((g.aiMetadata?.coreMechanics as string[]) || []).join(
            ", "
          )}`,
          `PlayModes: ${((g.aiMetadata?.playModes as string[]) || []).join(
            ", "
          )}`,
        ]
          .filter(Boolean)
          .join("\n");
        const { text: out } = await generateText({
          model: "openai/gpt-4o-mini",
          temperature: 0,
          system:
            "You are a strict relevance scorer for indie game search. Return ONLY a number between 0.0 and 1.0 (no text). Score measures how relevant the candidate game is to the query intent, focusing on mechanics, modes, player count, perspective, and themes. Penalize mismatched modes (e.g., single-player when query implies multiplayer/party) and unrelated genres.",
          prompt: `${text}\n\nReturn only a numeric score 0.0-1.0:`,
        });
        const m = out.match(/\d+(?:\.\d+)?/);
        s = m ? Math.max(0, Math.min(1, parseFloat(m[0]))) : 0;
        rerankCache.set(k, s);
      }
      scored.push({ g, s });
    }

    scored.sort((a, b) => {
      const byScore = b.s - a.s;
      if (byScore !== 0) return byScore;
      const bySim = (b.g.similarity || 0) - (a.g.similarity || 0);
      if (bySim !== 0) return bySim;
      const ak = a.g.appId ? String(a.g.appId) : a.g.title.toLowerCase();
      const bk = b.g.appId ? String(b.g.appId) : b.g.title.toLowerCase();
      return ak.localeCompare(bk);
    });

    const finalResults = scored
      .filter((x) => x.s >= rerankThreshold)
      .slice(0, 20)
      .map((x) => x.g);

    // Debug logging
    console.log(`Search query: "${query}"`);
    console.log(`Threshold used: ${threshold}`);
    console.log(
      `Total candidates after similarity threshold: ${candidates.length}`
    );
    console.log(
      `Reranked results >= ${rerankThreshold}: ${finalResults.length}`
    );
    if (finalResults.length > 0) {
      console.log(`Top similarity score: ${finalResults[0].similarity}`);
      console.log(`Top result title: ${finalResults[0].title}`);
    }

    return finalResults;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
};

export const getAllGames = async (): Promise<GameData[]> => {
  try {
    const tweets = await loadEmbeddedData();

    const allGames = tweets
      .filter((tweet) => tweet.steamProfiles && tweet.steamProfiles.length > 0)
      .flatMap((tweet) =>
        tweet.steamProfiles!.map((game): GameData => {
          const rawData = game.rawData;
          return {
            appId: game.appId,
            title: rawData.name,
            description: rawData.short_description,
            price:
              rawData.price_overview?.final_formatted ||
              (rawData.is_free ? "Free" : "N/A"),
            tags: rawData.genres?.map((g: any) => g.description) || [],
            releaseDate: rawData.release_date?.date || "",
            developer: rawData.developers?.join(", ") || "",
            publisher: rawData.publishers?.join(", ") || "",
            images: [
              rawData.header_image || "",
              ...(rawData.screenshots
                ?.slice(0, 4)
                .map((s: any) => s.path_full) || []),
            ].filter(Boolean),
            videos: [], // Video UI removed - Steam video URLs unreliable
            tweetId: tweet.id,
            tweetAuthor: tweet.author.userName,
            tweetText: tweet.fullText || tweet.text,
            aiMetadata: tweet.aiMetadata,
            tweetUrl: tweet.url,
            similarity: 1, // Default similarity for non-search results
          };
        })
      );

    return allGames;
  } catch (error) {
    console.error("Error loading games:", error);
    return [];
  }
};
