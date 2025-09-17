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

  protected convertToGameData(
    processedGame: any,
    similarity: number = 1
  ): GameData {
    const steamData = processedGame.steam_data;

    return {
      appId: processedGame.app_id,
      title: steamData.name,
      description: steamData.short_description,
      price:
        steamData.price_overview?.final_formatted ||
        (steamData.is_free ? "Free" : "N/A"),
      tags: steamData.genres?.map((g: any) => g.description) || [],
      releaseDate: steamData.release_date?.date || "",
      developer: steamData.developers?.join(", ") || "",
      publisher: steamData.publishers?.join(", ") || "",
      images: [
        steamData.header_image || "",
        ...(steamData.screenshots?.slice(0, 4).map((s: any) => s.path_full) ||
          []),
      ].filter(Boolean),
      videos: [],
      tweetId: `game_${processedGame.app_id}`,
      tweetAuthor: steamData.developers?.[0] || "IndieGameDev",
      tweetText: processedGame.semantic_description,
      tweetUrl: `https://store.steampowered.com/app/${processedGame.app_id}`,
      similarity,
      structuredMetadata: this.extractStructuredMetadata(steamData),
    };
  }

  protected extractStructuredMetadata(steamData: any) {
    const playModes = new Set<string>();

    (steamData.categories || []).forEach((cat: any) => {
      const desc = cat.description.toLowerCase();
      if (desc.includes("single-player")) playModes.add("single-player");
      if (desc.includes("multi-player")) playModes.add("multi-player");
      if (desc.includes("co-op")) playModes.add("co-op");
      if (desc.includes("pvp")) playModes.add("pvp");
      if (desc.includes("split screen")) playModes.add("split-screen");
    });

    return {
      play_modes: Array.from(playModes),
      steam_tags: steamData.genres?.map((g: any) => g.description) || [],
      release_status: steamData.release_date?.coming_soon
        ? "Upcoming"
        : "Released",
      is_free: steamData.is_free,
      price:
        steamData.price_overview?.final_formatted ||
        (steamData.is_free ? "Free" : "N/A"),
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
