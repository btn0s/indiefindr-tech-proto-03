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


function convertToGameData(
  game: any,
  similarity: number = 1,
  matchReason?: string
): GameData {
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
    matchReason,
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

async function scoreGameRelevance(
  query: string,
  game: any
): Promise<{ score: number; reason: string }> {
  try {
    const { text } = await generateText({
      model: models.chatModelMini,
      temperature: 0.4,
      system: `You are an enthusiastic game curator helping users discover games they might enjoy. Create compelling connections using "if you like X, you'll like this" style explanations.

Return ONLY this format:
SCORE: [0-10]
REASON: [exactly 20 words max, use "If you like..." or "Like X but with..." style]

Examples:
SCORE: 9
REASON: If you like roguelikes, you'll love this deckbuilding twist on classic dungeon crawling mechanics.

SCORE: 7  
REASON: Like roguelikes but prefer strategy? This combines tactical combat with progressive difficulty and exploration.

SCORE: 5
REASON: If you enjoy challenging games, this offers similar strategic depth with unique boss encounters.

Focus on positive appeal and connections. Make users excited to try the game.`,
      prompt: `User searched for: "${query}"

Game: "${game.steam_data.name}"
Description: "${game.steam_data.short_description}"
Genres: ${(game.steam_data.genres || [])
        .map((g: any) => g.description)
        .join(", ")}

Create an appealing connection for users who searched "${query}":`,
    });

    // Parse the response
    const lines = text.trim().split("\n");
    const scoreLine = lines.find((line) => line.startsWith("SCORE:"));
    const reasonLine = lines.find((line) => line.startsWith("REASON:"));

    const score = scoreLine ? parseInt(scoreLine.split(":")[1].trim()) : 0;
    const reason = reasonLine
      ? reasonLine.split(":")[1].trim()
      : "Might appeal to similar gaming interests";

    return { score: score / 10, reason }; // Normalize to 0-1
  } catch (error) {
    console.error("LLM scoring failed:", error);
    return { score: 0, reason: "Might appeal to similar gaming interests" };
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
    // Load all games
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

    console.log(
      `🔄 LLM scoring ${allGames.length} games for query: "${query}"`
    );

    // Use LLM to score and explain each game's relevance
    const scoredGames = await Promise.all(
      allGames.map(async (game: any) => {
        const { score, reason } = await scoreGameRelevance(query, game);

        if (score < 0.3) return null; // Filter out low-relevance games

        return {
          game,
          score,
          reason,
        };
      })
    );

    // Filter out null results and convert to GameData
    const candidates = scoredGames
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => b.score - a.score)
      .map(({ game, score, reason }) => convertToGameData(game, score, reason));

    // Save search analytics
    const processingTime = Date.now() - startTime;
    try {
      await supabase.from("searches").insert({
        original_query: query,
        transformed_query: `LLM-scored search`,
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
