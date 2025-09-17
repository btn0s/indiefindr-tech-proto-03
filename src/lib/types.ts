// Types for raw data from 0-gather.ts
export interface GatherData {
  id: string;
  text: string;
  fullText?: string;
  url: string;
  entities?: {
    urls?: { expanded_url: string }[];
  };
  author: {
    userName: string;
  };
}

// Structured, factual metadata extracted from Steam API
export interface StructuredMetadata {
  play_modes: string[];
  steam_tags: string[];
  release_status: string;
  is_free: boolean;
  price: string;
}

// Types for Steam data from 1-enrich.ts
export interface SteamData {
  appId: string;
  rawData: any; // Raw JSON from Steam API
  structured_metadata: StructuredMetadata; // New structured data
}

// The main tweet object after enrichment in 1-enrich.ts
export interface EnrichedTweet extends GatherData {
  steamProfiles?: SteamData[];
  semantic_text_for_embedding?: string; // Will be added in step 2
  embedding?: number[]; // Will be added in step 3
}

// The final data structure for a single game in search results
export interface GameData {
  appId: string;
  title: string;
  description: string;
  price: string;
  tags: string[];
  releaseDate: string;
  developer: string;
  publisher: string;
  images: string[];
  videos: string[];
  tweetId: string;
  tweetAuthor: string;
  tweetText: string;
  tweetUrl: string;
  similarity: number;
  structuredMetadata: StructuredMetadata;
}

// Pipeline step output types
export interface GatherOutput {
  tweets: GatherData[];
}

export interface EnrichOutput {
  tweets: EnrichedTweet[];
}

export interface MetadataOutput {
  tweets: EnrichedTweet[]; // tweets with aiMetadata
}

export interface EmbedOutput {
  tweets: EnrichedTweet[]; // tweets with embeddings
}

// Search result type
export interface SearchResult {
  games: GameData[];
  query?: string;
  count?: number;
}

// Reference game for "games like X" functionality
export interface ReferenceGame {
  id: string;
  steamAppId: number;
  name: string;
  description: string;
  isIndie: boolean;
  isHidden: boolean; // Hide from public lists if not indie
  embedding?: number[];
  steamUrl: string;
  createdAt: string;
}

// Similar games search result
export interface SimilarGamesResult {
  referenceGame: ReferenceGame;
  similarGames: GameData[];
  wasNewReference: boolean;
  query: string;
}
