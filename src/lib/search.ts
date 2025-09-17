import { embed } from "ai";
import fs from "fs";
import path from "path";

const embeddingModel = "openai/text-embedding-3-small";

interface FinalTweet {
  id: string;
  author: {
    userName: string;
    url: string;
  };
  steamProfiles?: Array<{
    appId: string;
    title: string;
    description: string;
    price: string;
    tags: string[];
    releaseDate: string;
    developer: string;
    publisher: string;
    images: string[];
  }>;
  text?: string;
  fullText?: string;
  createdAt?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  url?: string;
  extendedEntities?: any;
  isQuote?: boolean;
  quote?: any;
  entities?: {
    urls?: Array<{
      expanded_url: string;
    }>;
  };
  aiMetadata?: {
    summary: string;
    gameTitles: string[];
    genres: string[];
    keyFeatures: string[];
    targetAudience: string;
    releaseStatus: string;
  };
  embedding: number[];
}

const loadEmbeddedData = async (): Promise<FinalTweet[]> => {
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

export const searchGames = async (query: string) => {
  try {
    // Load embedded data
    const tweets = await loadEmbeddedData();
    
    // Generate embedding for the search query
    const { embedding: queryEmbedding } = await embed({
      model: embeddingModel,
      value: query,
    });

    // Calculate similarities and filter
    const gamesWithSimilarity = tweets
      .filter(tweet => tweet.steamProfiles && tweet.steamProfiles.length > 0)
      .flatMap(tweet =>
        tweet.steamProfiles!.map(game => ({
          ...game,
          tweetId: tweet.id,
          tweetAuthor: tweet.author.userName,
          tweetText: tweet.fullText || tweet.text,
          aiMetadata: tweet.aiMetadata,
          tweetUrl: tweet.url,
          similarity: cosineSimilarity(queryEmbedding, tweet.embedding),
        }))
      )
      .filter(item => item.similarity > 0.3) // Similarity threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20); // Limit results

    return gamesWithSimilarity;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
};

export const getAllGames = async () => {
  try {
    const tweets = await loadEmbeddedData();
    
    const allGames = tweets
      .filter(tweet => tweet.steamProfiles && tweet.steamProfiles.length > 0)
      .flatMap(tweet =>
        tweet.steamProfiles!.map(game => ({
          ...game,
          tweetId: tweet.id,
          tweetAuthor: tweet.author.userName,
          tweetText: tweet.fullText || tweet.text,
          aiMetadata: tweet.aiMetadata,
          tweetUrl: tweet.url,
          similarity: 1, // Default similarity for non-search results
        }))
      );

    return allGames;
  } catch (error) {
    console.error("Error loading games:", error);
    return [];
  }
};
