import { createClient } from "@supabase/supabase-js";
import { embed, generateText } from "ai";
import { GameData } from "@/lib/types";
import models from "@/lib/ai/models";

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple cache
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getFromCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item || Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

function convertToGameData(game: any, similarity: number = 1): GameData {
  const steamData = game.steam_data;

  return {
    appId: game.app_id,
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
    tweetId: `game_${game.app_id}`,
    tweetAuthor: steamData.developers?.[0] || "IndieGameDev",
    tweetText: game.semantic_description,
    tweetUrl: `https://store.steampowered.com/app/${game.app_id}`,
    similarity,
    structuredMetadata: {
      play_modes: extractPlayModes(steamData),
      steam_tags: steamData.genres?.map((g: any) => g.description) || [],
      release_status: steamData.release_date?.coming_soon
        ? "Upcoming"
        : "Released",
      is_free: steamData.is_free,
      price:
        steamData.price_overview?.final_formatted ||
        (steamData.is_free ? "Free" : "N/A"),
    },
  };
}

function extractPlayModes(steamData: any): string[] {
  const playModes = new Set<string>();

  (steamData.categories || []).forEach((cat: any) => {
    const desc = cat.description.toLowerCase();
    if (desc.includes("single-player")) playModes.add("single-player");
    if (desc.includes("multi-player")) playModes.add("multi-player");
    if (desc.includes("co-op")) playModes.add("co-op");
    if (desc.includes("pvp")) playModes.add("pvp");
    if (desc.includes("split screen")) playModes.add("split-screen");
  });

  return Array.from(playModes);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

async function transformQuery(userQuery: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: models.chatModelMini,
      temperature: 0.3,
      system: `Transform user search queries into rich semantic descriptions for indie game search.

Focus on gameplay mechanics, visual style, themes, and player experience.

Examples:
"games like hades" → "fast-paced action roguelike Greek mythology isometric hack-slash challenging combat narrative storytelling underworld themes"
"relaxing games" → "peaceful calm low-stress exploration crafting cozy atmosphere meditative gameplay wholesome experience"
"co-op puzzle games" → "cooperative multiplayer puzzle-solving teamwork brain-teasers logic challenges shared problem-solving"
"pixel art platformer" → "retro pixel graphics side-scrolling jumping platforming nostalgic 16-bit style precision movement"
"challenging games" → "difficult gameplay demanding skill-based mechanics precise timing mastery-focused hardcore experience"`,
      prompt: `Transform this search query into a rich semantic description: "${userQuery}"`,
    });

    return text.trim();
  } catch (error) {
    console.error("Query transformation failed:", error);
    return userQuery; // Fallback to original query
  }
}

export async function searchGames(query: string): Promise<GameData[]> {
  if (!query || query.length < 3) {
    return getAllGames();
  }

  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getFromCache<GameData[]>(cacheKey);
  if (cached) return cached;

  try {
    // Transform natural language query into rich semantic description
    const semanticQuery = await transformQuery(query);
    console.log(`🔄 Query transformation: "${query}" → "${semanticQuery}"`);

    // Get query embedding
    const { embedding: queryEmbedding } = await embed({
      model: models.embeddingModel,
      value: semanticQuery,
    });

    // Load games from database
    const { data: games, error } = await supabase
      .from("games")
      .select("app_id, semantic_description, embedding, steam_data")
      .eq("status", "ready");

    if (error) {
      console.error("Database error:", error);
      return [];
    }

    if (!games || games.length === 0) {
      return [];
    }

    // Find similar games
    const threshold = 0.5;
    const candidates = games
      .map((game: any) => {
        if (!game.embedding) return null;

        // Parse embedding if it's a string
        const gameEmbedding =
          typeof game.embedding === "string"
            ? JSON.parse(game.embedding)
            : game.embedding;

        const similarity = cosineSimilarity(queryEmbedding, gameEmbedding);
        if (similarity < threshold) return null;

        return convertToGameData(game, similarity);
      })
      .filter((game): game is GameData => game !== null)
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

    setCache(cacheKey, candidates);
    return candidates;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

export async function getAllGames(): Promise<GameData[]> {
  const cacheKey = "all_games";
  const cached = getFromCache<GameData[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data: games, error } = await supabase
      .from("games")
      .select("app_id, semantic_description, embedding, steam_data")
      .eq("status", "ready");

    if (error || !games) {
      console.error("Database error:", error);
      return [];
    }

    const allGames = games.map((game: any) => convertToGameData(game, 1));
    setCache(cacheKey, allGames);
    return allGames;
  } catch (error) {
    console.error("Error loading games:", error);
    return [];
  }
}
