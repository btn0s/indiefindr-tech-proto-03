import { createClient } from "@supabase/supabase-js";
import { embed, generateText } from "ai";
import { GameData } from "@/lib/types";
import models from "@/lib/ai/models";
import fs from "fs";
import path from "path";

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load gaming reference once
let gamingReference: string | null = null;
function getGamingReference(): string {
  if (!gamingReference) {
    try {
      const referencePath = path.join(
        process.cwd(),
        "src/assets/context/gaming-reference.txt"
      );
      gamingReference = fs.readFileSync(referencePath, "utf-8");
    } catch (error) {
      console.error("Failed to load gaming reference:", error);
      gamingReference = "";
    }
  }
  return gamingReference;
}

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

function calculateTextMatchBoost(query: string, game: any): number {
  const queryLower = query.toLowerCase();
  const steamData = game.steam_data;

  let boost = 0;

  // Exact title match gets highest boost
  if (steamData.name?.toLowerCase().includes(queryLower)) {
    boost += 0.5;
  }

  // Genre matches get good boost
  const genres = (steamData.genres || []).map((g: any) =>
    g.description.toLowerCase()
  );
  if (
    genres.some(
      (genre: string) =>
        genre.includes(queryLower) || queryLower.includes(genre)
    )
  ) {
    boost += 0.3;
  }

  // Developer/publisher matches
  const developers = (steamData.developers || []).map((d: string) =>
    d.toLowerCase()
  );
  const publishers = (steamData.publishers || []).map((p: string) =>
    p.toLowerCase()
  );
  if (
    developers.some((dev: string) => dev.includes(queryLower)) ||
    publishers.some((pub: string) => pub.includes(queryLower))
  ) {
    boost += 0.2;
  }

  // Description matches get smaller boost
  if (steamData.short_description?.toLowerCase().includes(queryLower)) {
    boost += 0.1;
  }

  // Tags/categories matches
  const categories = (steamData.categories || []).map((c: any) =>
    c.description.toLowerCase()
  );
  if (categories.some((cat: string) => cat.includes(queryLower))) {
    boost += 0.15;
  }

  return Math.min(boost, 0.8); // Cap boost at 0.8 so LLM score still matters
}

async function scoreGameRelevance(
  query: string,
  game: any
): Promise<{ score: number; reason: string }> {
  try {
    const gamingRef = getGamingReference();

    const { text } = await generateText({
      model: models.chatModelMini,
      temperature: 0.4,
      system: `You are an expert indie game curator with deep knowledge of gaming genres and terminology. Use the reference below to understand what users are looking for.

${gamingRef}

Be STRICT about genre matches - only recommend games that actually fit what the user wants.

Return ONLY this format:
SCORE: [0-10]
REASON: [exactly 20 words max, use "If you like..." or "Like X but with..." style]

Scoring Guidelines:
- 8-10: Perfect genre match with core mechanics
- 6-7: Strong connection with similar gameplay elements  
- 4-5: Some overlapping mechanics but different genre
- 2-3: Weak thematic connection only
- 0-1: No real connection - BE HONEST, don't force connections

For highly specific genres (like "suika", "soulslike", "metroidvania"):
- Be VERY strict - only score high if the game actually has the core mechanics
- Don't give points just for being "challenging" or "puzzle-like"
- A score of 0 is perfectly fine if there's no real match

Examples:
SCORE: 9
REASON: If you like Suika games, you'll love this physics-based puzzle with satisfying merging mechanics.

SCORE: 7  
REASON: Like Suika but prefer strategy? This combines spatial reasoning with tactical combat elements.

SCORE: 2
REASON: If you enjoy puzzle games, this offers different mechanics but similar satisfying progression.

Focus on accurate genre understanding and positive connections. Make users excited to discover new games.`,
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

export async function searchGames(
  query: string,
  userId?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ games: GameData[]; totalCount: number; hasMore: boolean }> {
  if (!query || query.length < 3) {
    const allGames = await getAllGames();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedGames = allGames.slice(startIndex, endIndex);

    return {
      games: paginatedGames,
      totalCount: allGames.length,
      hasMore: endIndex < allGames.length,
    };
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
      return { games: [], totalCount: 0, hasMore: false };
    }

    if (!allGames || allGames.length === 0) {
      return { games: [], totalCount: 0, hasMore: false };
    }

    // First pass: Apply text boost to all games for fast filtering
    const textBoostedGames = allGames.map((game: any) => ({
      game,
      textBoost: calculateTextMatchBoost(query, game),
    }));

    // Sort by text boost first to prioritize exact matches
    textBoostedGames.sort((a, b) => b.textBoost - a.textBoost);

    // Calculate batch size - process more games if we have good text matches
    const highTextBoostCount = textBoostedGames.filter(
      (g) => g.textBoost > 0.2
    ).length;
    const batchSize = Math.max(
      pageSize * 2,
      Math.min(100, highTextBoostCount + 50)
    );

    // Take top candidates for LLM scoring
    const candidatesForScoring = textBoostedGames.slice(0, batchSize);

    console.log(
      `🔄 LLM scoring top ${candidatesForScoring.length}/${allGames.length} games for query: "${query}" (page ${page})`
    );

    // Use LLM to score and explain each candidate's relevance
    const scoredGames = await Promise.all(
      candidatesForScoring.map(async ({ game, textBoost }) => {
        const { score: llmScore, reason } = await scoreGameRelevance(
          query,
          game
        );
        const finalScore = Math.min(llmScore + textBoost, 1.0); // Cap at 1.0

        if (finalScore < 0.3) return null; // Lower threshold since we pre-filtered

        return {
          game,
          score: finalScore,
          llmScore,
          textBoost,
          reason,
        };
      })
    );

    // Filter out null results and sort by final score
    const validResults = scoredGames
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => b.score - a.score);

    // Apply pagination to final results
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = validResults.slice(startIndex, endIndex);

    // Convert to GameData
    const games = paginatedResults.map(({ game, score, reason }) =>
      convertToGameData(game, score, reason)
    );

    // Log top results with scoring breakdown for debugging
    if (games.length > 0) {
      console.log(
        `🎯 Page ${page} results for "${query}" (${games.length}/${validResults.length} total):`
      );
      games.slice(0, 3).forEach((game, i) => {
        const result = paginatedResults[i];
        if (result) {
          console.log(
            `${startIndex + i + 1}. ${
              game.title
            } - Final: ${result.score.toFixed(
              2
            )} (LLM: ${result.llmScore.toFixed(
              2
            )} + Text: ${result.textBoost.toFixed(2)})`
          );
        }
      });
    }

    // Save search analytics
    const processingTime = Date.now() - startTime;
    try {
      await supabase.from("searches").insert({
        original_query: query,
        transformed_query: `LLM + text boost search (page ${page})`,
        result_count: games.length,
        processing_time_ms: processingTime,
        user_id: userId,
      });
    } catch (analyticsError) {
      console.error("Failed to save search analytics:", analyticsError);
      // Don't fail the search if analytics fail
    }

    return {
      games,
      totalCount: validResults.length,
      hasMore: endIndex < validResults.length,
    };
  } catch (error) {
    console.error("Search error:", error);
    return { games: [], totalCount: 0, hasMore: false };
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
