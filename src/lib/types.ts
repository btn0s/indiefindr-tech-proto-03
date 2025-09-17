// Shared types for the complete pipeline: Gather -> Steam -> Metadata -> Embeddings

// Step 1: Gather Data (Twitter tweets)
export interface GatherData {
  id: string;
  author: {
    userName: string;
    url: string;
  };
  text?: string;
  fullText?: string;
  createdAt?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  url?: string;
  entities?: {
    urls?: Array<{
      expanded_url: string;
    }>;
  };
  extendedEntities?: any;
  isQuote?: boolean;
  quote?: any;
}

// Step 2: Steam Data (Raw Steam API response)
export interface SteamData {
  appId: string;
  rawData: {
    // Core game info
    steam_appid: number;
    name: string;
    short_description: string;
    detailed_description?: string;
    about_the_game?: string;
    type: string;
    is_free: boolean;
    required_age: number;

    // Pricing
    price_overview?: {
      currency: string;
      initial: number;
      final: number;
      discount_percent: number;
      initial_formatted: string;
      final_formatted: string;
    };

    // Release info
    release_date?: {
      coming_soon: boolean;
      date: string;
    };

    // Developers & Publishers
    developers?: string[];
    publishers?: string[];

    // Categories & Genres
    categories?: Array<{
      id: number;
      description: string;
    }>;
    genres?: Array<{
      id: string;
      description: string;
    }>;

    // Platform support
    platforms: {
      windows?: boolean;
      mac?: boolean;
      linux?: boolean;
    };

    // Media
    header_image?: string;
    screenshots?: Array<{
      id: number;
      path_thumbnail: string;
      path_full: string;
    }>;
    movies?: Array<{
      id: number;
      name: string;
      thumbnail: string;
      webm: {
        "480": string;
        max: string;
      };
      mp4: {
        "480": string;
        max: string;
      };
      highlight: boolean;
    }>;

    // Requirements
    pc_requirements?: {
      minimum?: string;
      recommended?: string;
    };
    mac_requirements?: {
      minimum?: string;
      recommended?: string;
    };
    linux_requirements?: {
      minimum?: string;
      recommended?: string;
    };

    // Content & Ratings
    content_descriptors?: {
      ids: string[];
      notes?: string;
    };
    metacritic?: {
      score: number;
      url: string;
    };

    // Languages & Support
    supported_languages?: {
      [key: string]: boolean;
    };
    support_info?: {
      url: string;
      email: string;
    };

    // Additional fields
    controller_support?: string;
    dlc?: any[];
    recommendations?: {
      total: number;
    };
    achievements?: {
      total: number;
      highlighted: Array<{
        name: string;
        path: string;
      }>;
    };
    website?: string;
    legal_notice?: string;
    background?: string;
    background_raw?: string;
    capsule_image?: string;
    capsule_imagev5?: string;
    ratings?: any;
    package_groups?: any[];
    packages?: any[];
    fullgame?: any;
    demos?: any[];
    depots?: any;
    commercial?: any;
    ext_user_account_notice?: string;
  };
}

// Step 3: AI Metadata (Generated from Steam data + tweet context)
export interface AIMetadata {
  summary: string;
  gameTitles: string[];
  genres: string[];
  keyFeatures: string[];
  targetAudience: string;
  releaseStatus: string;

  // Experiential metadata
  mood: string[];
  vibe: string[];
  atmosphere: string[];
  playStyle: string[];
  socialContext: string[];
  difficultyLevel: string;
  emotionalTone: string[];
  settingAesthetics: string[];
  gameplayFeel: string[];

  // First-principles game attributes
  playModes: string[];
  coreMechanics: string[];
  cameraPerspective: string[];
  artStyle: string[];
  visualStyle: string[];
  controlScheme: string[];
  sessionLength: string[];
  complexity: string;
  multiplayerFeatures: string[];
  contentRating: string;
  platformSupport: string[];
  languageSupport: string[];
  accessibility: string[];
  performance: string[];
}

// Step 4: Final Game Data (For UI display)
export interface GameData {
  // Steam data (extracted from rawData)
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

  // Tweet attribution
  tweetId: string;
  tweetAuthor: string;
  tweetText?: string;
  tweetUrl?: string;

  // AI metadata
  aiMetadata?: AIMetadata;

  // Search result data
  similarity?: number;
}

// Complete Pipeline Data Structure
export interface EnrichedTweet {
  // Original gather data
  id: string;
  author: {
    userName: string;
    url: string;
  };
  text?: string;
  fullText?: string;
  createdAt?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  url?: string;
  entities?: {
    urls?: Array<{
      expanded_url: string;
    }>;
  };
  extendedEntities?: any;
  isQuote?: boolean;
  quote?: any;

  // Steam enrichment
  steamProfiles?: SteamData[];

  // AI metadata (added in step 3)
  aiMetadata?: AIMetadata;

  // Embeddings (added in step 4)
  embedding?: number[];
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
