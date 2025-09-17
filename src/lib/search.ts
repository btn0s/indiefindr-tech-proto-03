import { embed, generateText, generateObject } from "ai";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { EnrichedTweet, GameData } from "@/lib/types";
import models from "@/lib/ai/models";

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

// Caches
const hydeCache = new Map<string, number[]>();
const rerankCache = new Map<string, number>();
const resultCache = new Map<string, { data: GameData[]; ts: number }>();
const RESULTS_TTL_MS = 60_000;

const parseHardFilters = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return {
    isCoop: /\b(co-?op|multiplayer)\b/i.test(lowerQuery),
  };
};

export const searchGames = async (query: string): Promise<GameData[]> => {
  try {
    const cacheKey = query.trim().toLowerCase();
    const cached = resultCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.ts < RESULTS_TTL_MS) {
      return cached.data;
    }

    const tweets = await loadEmbeddedData();
    const { embedding: baseEmbedding } = await embed({
      model: models.embeddingModel,
      value: query,
    });

    let queryEmbedding = baseEmbedding;
    const tokenCount = query.trim().split(/\s+/).filter(Boolean).length;
    if (tokenCount <= 2) {
      try {
        let hydeEmbedding = hydeCache.get(cacheKey);
        if (!hydeEmbedding) {
          const { text: hypothetical } = await generateText({
            model: models.chatModelMini,
            temperature: 0,
            system:
              "You expand ultra-short search queries into dense game descriptors for semantic search. Focus on gameplay intent and constraints. Prefer mechanics and modes over vibes. Keep under 24 words.",
            prompt: `User query: "${query}"\n...[HyDE examples omitted]...\nNow produce the descriptor for: ${query}`,
          });
          const { embedding } = await embed({
            model: models.embeddingModel,
            value: hypothetical.replaceAll("\n", " "),
          });
          hydeEmbedding = embedding;
          hydeCache.set(cacheKey, hydeEmbedding);
        }
        const hydeWeight = 0.65,
          baseWeight = 0.35;
        queryEmbedding = baseEmbedding.map(
          (v, i) => baseWeight * v + hydeWeight * (hydeEmbedding![i] as number)
        );
      } catch {
        queryEmbedding = baseEmbedding;
      }
    }

    // 1. RETRIEVAL
    const threshold = query.length <= 5 ? 0.15 : 0.25;
    const candidates = tweets
      .flatMap(
        (tweet) =>
          tweet.steamProfiles?.map((game): GameData | null => {
            const similarity = cosineSimilarity(
              queryEmbedding,
              tweet.embedding!
            );
            if (similarity < threshold || !game.structured_metadata)
              return null;

            const rawData = game.rawData;
            return {
              appId: game.appId,
              title: rawData.name,
              description: rawData.short_description,
              price: game.structured_metadata.price,
              tags: game.structured_metadata.steam_tags,
              releaseDate: rawData.release_date?.date || "",
              developer: rawData.developers?.join(", ") || "",
              publisher: rawData.publishers?.join(", ") || "",
              images: [
                rawData.header_image || "",
                ...(rawData.screenshots
                  ?.slice(0, 4)
                  .map((s: any) => s.path_full) || []),
              ].filter(Boolean),
              videos: [],
              tweetId: tweet.id,
              tweetAuthor: tweet.author.userName,
              tweetText: tweet.fullText || tweet.text,
              tweetUrl: tweet.url,
              similarity,
              structuredMetadata: game.structured_metadata,
            };
          }) || []
      )
      .filter((g): g is GameData => g !== null);

    const semRanked = [...candidates].sort(
      (a, b) => (b.similarity || 0) - (a.similarity || 0)
    );

    const prelim: GameData[] = [];
    const seen = new Set<string>();
    for (const g of semRanked) {
      const key = g.appId ? String(g.appId) : g.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      prelim.push(g);
      if (prelim.length >= 100) break;
    }

    // 2. HARD FILTERING
    const filters = parseHardFilters(query);
    let filteredCandidates = prelim;
    if (filters.isCoop) {
      filteredCandidates = prelim.filter((g) =>
        g.structuredMetadata.play_modes.some(
          (m) => m.includes("co-op") || m.includes("multiplayer")
        )
      );
    }

    // 3. RERANKING
    const rerankThreshold = 0.4;
    const rerankCandidates = filteredCandidates.slice(0, 40);

    const ids = rerankCandidates.map((g) =>
      g.appId ? String(g.appId) : g.title.toLowerCase()
    );
    const toScore = rerankCandidates.map((g, i) => {
      const k = `${cacheKey}|${ids[i]}`;
      return { k, g, cached: rerankCache.get(k) } as const;
    });

    const uncached = toScore.filter((x) => x.cached === undefined);
    if (uncached.length > 0) {
      const items = uncached.map(({ g }, i) => ({
        id: i,
        title: g.title,
        description: g.description || "",
        tags: g.structuredMetadata.steam_tags.join(", "),
        playModes: g.structuredMetadata.play_modes.join(", "),
      }));

      const schema = z.object({ scores: z.array(z.number()) });
      const { object } = await generateObject({
        model: models.chatModelMini,
        temperature: 0,
        schema,
        system: "You are a strict relevance scorer for indie game search...",
        prompt: `Query: ${query}\nItems:\n${items
          .map(
            (it) =>
              `#${it.id} | Title: ${it.title} | Modes: ${it.playModes} | Tags: ${it.tags}`
          )
          .join("\n\n")}\n\nReturn JSON: { "scores": [ ... ] }`,
      });
      const scores = object.scores || [];
      uncached.forEach(({ k }, idx) => {
        const s = Math.max(0, Math.min(1, Number(scores[idx] ?? 0)));
        rerankCache.set(k, s);
      });
    }

    const scored = toScore.map(({ k, g, cached }) => ({
      g,
      s: (cached ?? rerankCache.get(k) ?? 0) as number,
    }));

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

    resultCache.set(cacheKey, { data: finalResults, ts: now });

    // Debug logging
    console.log(`Search query: "${query}"`);
    console.log(`Retrieved ${prelim.length} candidates.`);
    if (filters.isCoop)
      console.log(`Filtered to ${filteredCandidates.length} co-op candidates.`);
    console.log(`Reranked to ${finalResults.length} final results.`);
    if (finalResults.length > 0)
      console.log(`Top result: ${finalResults[0].title}`);

    return finalResults;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
};

// getAllGames also needs to be updated to use the new structure
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
              game.structured_metadata?.price ||
              rawData.price_overview?.final_formatted ||
              (rawData.is_free ? "Free" : "N/A"),
            tags:
              game.structured_metadata?.steam_tags ||
              rawData.genres?.map((g: any) => g.description) ||
              [],
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
            tweetUrl: tweet.url,
            similarity: 1, // Default similarity for non-search results
            structuredMetadata: game.structured_metadata, // Add required field
          };
        })
      );

    return allGames;
  } catch (error) {
    console.error("Error loading games:", error);
    return [];
  }
};
