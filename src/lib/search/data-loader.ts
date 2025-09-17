import path from "path";
import fs from "fs";
import { EnrichedTweet } from "@/lib/types";
import { searchCache } from "./cache";

export class DataLoader {
  private static instance: DataLoader;
  private readonly CACHE_KEY = "embedded_data";
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): DataLoader {
    if (!DataLoader.instance) {
      DataLoader.instance = new DataLoader();
    }
    return DataLoader.instance;
  }

  async loadEmbeddedData(): Promise<EnrichedTweet[]> {
    // Check cache first
    const cached = await searchCache.get<EnrichedTweet[]>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

    try {
      const filePath = path.join(
        process.cwd(),
        "public/data/embed-results.json"
      );
      const data = await fs.promises.readFile(filePath, "utf-8");
      const tweets: EnrichedTweet[] = JSON.parse(data);

      // Cache the data
      await searchCache.set(this.CACHE_KEY, tweets, this.CACHE_TTL);

      return tweets;
    } catch (error) {
      console.error("Failed to load embedded data:", error);
      throw new Error("Unable to load game data");
    }
  }

  async refreshCache(): Promise<void> {
    await searchCache.delete(this.CACHE_KEY);
    await this.loadEmbeddedData();
  }
}
