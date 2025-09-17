import { GameData } from "@/lib/types";

export interface SearchIntent {
  type: "semantic" | "similar" | "genre" | "mood" | "feature" | "hybrid";
  confidence: number;
  entities: {
    referenceGame?: string;
    genres?: string[];
    features?: string[];
    mood?: string;
    playModes?: string[];
  };
  searchStrategy: string;
  reasoning?: string;
}

export interface SearchContext {
  query: string;
  intent: SearchIntent;
  userId?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  preferredGenres?: string[];
  excludedGenres?: string[];
  priceRange?: { min: number; max: number };
  releaseYearRange?: { min: number; max: number };
}

export interface SearchResponse {
  results: GameData[];
  metadata: {
    query: string;
    intent: SearchIntent;
    searchType: string;
    processingTimeMs: number;
    resultCount: number;
    cacheHit: boolean;
    strategy: string;
  };
  referenceGame?: {
    name: string;
    steamUrl: string;
    isIndie: boolean;
  };
  suggestions?: string[];
}

export interface SearchStrategy {
  name: string;
  execute(context: SearchContext): Promise<GameData[]>;
  canHandle(intent: SearchIntent): boolean;
}

export interface CacheItem<T = any> {
  data: T;
  expires: number;
  metadata?: Record<string, any>;
}

export interface SearchFilter {
  apply(games: GameData[], context: SearchContext): GameData[];
  priority: number;
}

export interface SearchRanker {
  rank(games: GameData[], context: SearchContext): GameData[];
  weight: number;
}
