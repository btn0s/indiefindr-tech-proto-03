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
        const { text: hypothetical } = await generateText({
          model: "openai/gpt-4o-mini",
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

        const { embedding: hydeEmbedding } = await embed({
          model: embeddingModel,
          value: hypothetical.replaceAll("\n", " "),
        });

        // Weighted blend (lean toward expanded intent for short queries)
        const hydeWeight = 0.65;
        const baseWeight = 0.35;
        queryEmbedding = baseEmbedding.map(
          (v, i) => baseWeight * v + hydeWeight * hydeEmbedding[i]
        );
      } catch {
        // Fall back to base embedding if HyDE expansion fails
        queryEmbedding = baseEmbedding;
      }
    }

    // Dynamic similarity threshold based on query length
    // Lower thresholds to match semantic image search approach (0.28)
    const threshold = query.length <= 5 ? 0.22 : 0.25;

    // No hard-coded genre validation - let embeddings work naturally

    // Calculate similarities and filter
    const gamesWithSimilarity = tweets
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
      .filter((item) => item.similarity && item.similarity > threshold)
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, 20); // Limit results

    // Debug logging
    console.log(`Search query: "${query}"`);
    console.log(`Threshold used: ${threshold}`);
    console.log(
      `Total results after similarity filtering: ${gamesWithSimilarity.length}`
    );
    if (gamesWithSimilarity.length > 0) {
      console.log(`Top similarity score: ${gamesWithSimilarity[0].similarity}`);
      console.log(`Top result title: ${gamesWithSimilarity[0].title}`);
    }

    return gamesWithSimilarity;
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
