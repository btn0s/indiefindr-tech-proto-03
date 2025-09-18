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
      temperature: 0.5,
      system: `Transform user search queries into concise, keyword-rich descriptions for semantic game search. Focus on core gameplay mechanics, genres, and player experience.

Gaming-specific terms to recognize:
- "suikalike" → "physics dropping puzzle fruit merging watermelon stacking combining objects casual puzzle"
- "roguelike" → "procedural generation permadeath dungeon crawler random levels turn-based combat"
- "soulslike" → "challenging combat stamina management dark atmosphere boss battles death penalties"
- "metroidvania" → "interconnected world ability gating backtracking exploration platforming"
- "tetrislike" → "falling blocks line clearing spatial puzzle quick reflexes"
- "2048like" → "number combining grid sliding mathematical puzzle"

For other queries, extract:
- Core mechanics (combat, puzzle, exploration, building, etc.)
- Visual style (pixel art, minimalist, colorful, dark, etc.)
- Emotional tone (relaxing, challenging, scary, cozy, etc.)
- Player count (single-player, multiplayer, co-op, etc.)
- Genre keywords (action, adventure, simulation, strategy, etc.)

Output should be a focused string of relevant keywords and phrases, not full sentences.`,
      prompt: `Convert "${userQuery}" into search keywords:`,
    });

    return text.trim();
  } catch (error) {
    console.error("Query transformation failed:", error);
    return userQuery; // Fallback to original query
  }
}

async function getTextMatches(query: string): Promise<any[]> {
  try {
    const { data: allGames, error } = await supabase
      .from("games")
      .select("app_id, semantic_description, embedding, steam_data")
      .eq("status", "ready");

    if (error || !allGames) {
      console.error("Text search error:", error);
      return [];
    }

    // Search through the entire Steam JSON data
    return allGames.filter((game: any) => {
      const steamDataText = JSON.stringify(game.steam_data).toLowerCase();
      return steamDataText.includes(query.toLowerCase());
    });
  } catch (error) {
    console.error("Text search error:", error);
    return [];
  }
}

export async function searchGames(
  query: string,
  userId?: string
): Promise<GameData[]> {
  if (!query || query.length < 3) {
    return getAllGames();
  }

  const startTime = Date.now();

  try {
    // Get text matches first (fast, exact keyword matching)
    const textMatches = await getTextMatches(query);

    // Transform natural language query into rich semantic description
    const semanticQuery = await transformQuery(query);
    console.log(`🔄 Query transformation: "${query}" → "${semanticQuery}"`);

    // Get query embedding for semantic search
    const { embedding: queryEmbedding } = await embed({
      model: models.embeddingModel,
      value: semanticQuery,
    });

    // Load all games for semantic search
    const { data: allGames, error } = await supabase
      .from("games")
      .select("app_id, semantic_description, embedding, steam_data")
      .eq("status", "ready");

    if (error) {
      console.error("Database error:", error);
      return [];
    }

    if (!allGames || allGames.length === 0) {
      return [];
    }

    // Create a map for quick lookup
    const textMatchIds = new Set(textMatches.map((game) => game.app_id));

    // Find similar games with hybrid scoring
    const threshold = 0.5;
    const candidates = allGames
      .map((game: any) => {
        if (!game.embedding) return null;

        // Parse embedding if it's a string
        const gameEmbedding =
          typeof game.embedding === "string"
            ? JSON.parse(game.embedding)
            : game.embedding;

        const semanticSimilarity = cosineSimilarity(
          queryEmbedding,
          gameEmbedding
        );
        const hasTextMatch = textMatchIds.has(game.app_id);

        // Hybrid scoring: combine text matching with semantic similarity
        let finalSimilarity = semanticSimilarity;

        if (hasTextMatch) {
          // Check for exact title match first
          const title = game.steam_data.name?.toLowerCase() || "";
          const normalizedQuery = query.toLowerCase().trim();

          if (title === normalizedQuery) {
            // Exact title match gets perfect score
            finalSimilarity = 1.0;
          } else {
            // Other text matches get a significant boost
            finalSimilarity = Math.max(0.8, semanticSimilarity * 1.3);
          }
        }

        // Lower threshold for text matches since they're more precise
        const minThreshold = hasTextMatch ? 0.3 : threshold;
        if (finalSimilarity < minThreshold) return null;

        return convertToGameData(game, finalSimilarity);
      })
      .filter((game): game is GameData => game !== null)
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

    // Save search analytics
    const processingTime = Date.now() - startTime;
    try {
      await supabase.from("searches").insert({
        original_query: query,
        transformed_query: semanticQuery,
        query_embedding: queryEmbedding,
        result_count: candidates.length,
        processing_time_ms: processingTime,
        user_id: userId,
      });
    } catch (analyticsError) {
      console.error("Failed to save search analytics:", analyticsError);
      // Don't fail the search if analytics fail
    }

    return candidates;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

export async function getAllGames(): Promise<GameData[]> {
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
    return allGames;
  } catch (error) {
    console.error("Error loading games:", error);
    return [];
  }
}
