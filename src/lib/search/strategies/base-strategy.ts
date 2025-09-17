import { GameData } from "@/lib/types";
import { SearchStrategy, SearchContext, SearchIntent } from "../types";
import { DataLoader } from "../data-loader";

export abstract class BaseSearchStrategy implements SearchStrategy {
  abstract name: string;
  protected dataLoader = DataLoader.getInstance();

  abstract execute(context: SearchContext): Promise<GameData[]>;
  abstract canHandle(intent: SearchIntent): boolean;

  protected cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  protected convertTweetToGameData(
    tweet: any,
    game: any,
    similarity: number = 1
  ): GameData {
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
        ...(rawData.screenshots?.slice(0, 4).map((s: any) => s.path_full) ||
          []),
      ].filter(Boolean),
      videos: [],
      tweetId: tweet.id,
      tweetAuthor: tweet.author.userName,
      tweetText: tweet.fullText || tweet.text,
      tweetUrl: tweet.url,
      similarity,
      structuredMetadata: game.structured_metadata,
    };
  }

  protected deduplicateGames(games: GameData[]): GameData[] {
    const seen = new Set<string>();
    const deduplicated: GameData[] = [];

    for (const game of games) {
      const key = game.appId ? String(game.appId) : game.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(game);
      }
    }

    return deduplicated;
  }
}
