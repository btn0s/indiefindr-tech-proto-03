import { createClient } from "@supabase/supabase-js";
import { searchCache } from "./cache";

interface ProcessedGame {
  app_id: string;
  name: string;
  semantic_description: string;
  embedding: number[];
  steam_data: any;
}

export class DataLoader {
  private static instance: DataLoader;
  private readonly CACHE_KEY = "ready_games";
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  static getInstance(): DataLoader {
    if (!DataLoader.instance) {
      DataLoader.instance = new DataLoader();
    }
    return DataLoader.instance;
  }

  async loadReadyGames(): Promise<ProcessedGame[]> {
    // Check cache first
    const cached = await searchCache.get<ProcessedGame[]>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

    try {
      const { data: games, error } = await this.supabase
        .from("games")
        .select("app_id, name, semantic_description, embedding, steam_data")
        .eq("status", "ready");

      if (error) {
        console.error("Failed to load games from database:", error);
        throw new Error("Unable to load game data from database");
      }

      const processedGames = games || [];

      // Cache the data
      await searchCache.set(this.CACHE_KEY, processedGames, this.CACHE_TTL);

      return processedGames;
    } catch (error) {
      console.error("Failed to load game data:", error);
      throw new Error("Unable to load game data");
    }
  }

  async refreshCache(): Promise<void> {
    await searchCache.delete(this.CACHE_KEY);
    await this.loadReadyGames();
  }
}
