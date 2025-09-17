import { embed } from "ai";
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
    const { embedding: queryEmbedding } = await embed({
      model: embeddingModel,
      value: query,
    });

    // Dynamic similarity threshold based on query length
    const threshold = query.length <= 5 ? 0.18 : 0.2;

    // Keyword relevance checker
    const hasRelevantKeywords = (game: GameData, query: string): boolean => {
      // Define keyword mappings for common queries
        const keywordMap: Record<string, string[]> = {
          space: [
            "space",
            "galaxy",
            "cosmic",
            "solar",
            "astronaut",
            "spaceship",
            "star",
            "planet",
            "universe",
          ],
          horror: [
            "horror",
            "scary",
            "frightening",
            "terrifying",
            "spooky",
            "dread",
          ],
          rpg: [
            "rpg",
            "role playing",
            "character",
            "level",
            "quest",
            "adventure",
          ],
          puzzle: ["puzzle", "brain", "logic", "challenge", "solve"],
          action: ["action", "combat", "fight", "battle", "shooter"],
          strategy: ["strategy", "tactical", "plan", "manage", "build"],
          indie: ["indie", "independent", "small studio", "creator"],
          // Multi-word queries
          "space exploration": [
            "space",
            "exploration",
            "galaxy",
            "cosmic",
            "solar",
            "universe",
            "discover",
          ],
          "cozy games": [
            "cozy",
            "relaxing",
            "calm",
            "peaceful",
            "chill",
            "comfortable",
          ],
          "survival horror": [
            "survival",
            "horror",
            "scary",
            "frightening",
            "terrifying",
          ],
          "action rpg": [
            "action",
            "rpg",
            "role playing",
            "character",
            "combat",
          ],
        };

      const keywords = keywordMap[query.toLowerCase()] || [query.toLowerCase()];
      const text = `${game.title} ${game.description} ${
        game.tweetText || ""
      }`.toLowerCase();
      return keywords.some((keyword) => text.includes(keyword));
    };

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
            videos:
              rawData.movies
                ?.slice(0, 2)
                .map((m: any) => m.mp4?.max || m.mp4) || [],
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
      .filter((item) => hasRelevantKeywords(item, query)) // Multi-stage filtering
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
            videos:
              rawData.movies
                ?.slice(0, 2)
                .map((m: any) => m.mp4?.max || m.mp4) || [],
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
