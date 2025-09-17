import { NextRequest, NextResponse } from "next/server";

// Extract game name from "games like X" queries
const extractGameName = (query: string): string => {
  return query
    .replace(/^(games?\s+)?(like|similar to)\s+/i, "")
    .replace(/\s+(games?)?\s*$/i, "")
    .trim();
};

// Simple Steam API simulation (for prototyping)
const searchSteamGame = async (gameName: string): Promise<any> => {
  const mockSteamData = {
    "Among Us": {
      steam_appid: 945360,
      name: "Among Us",
      short_description:
        "An online and local party game of teamwork and betrayal for 4-15 players...in space!",
      developers: ["InnerSloth"],
      publishers: ["InnerSloth"],
      genres: [{ id: "1", description: "Action" }],
      is_free: false,
      price_overview: { final_formatted: "$4.99" },
      header_image:
        "https://cdn.akamai.steamstatic.com/steam/apps/945360/header.jpg",
      steam_url: "https://store.steampowered.com/app/945360/",
    },
    "Call of Duty": {
      steam_appid: 1985810,
      name: "Call of Duty: Modern Warfare III",
      short_description:
        "The most-anticipated game in the franchise is back with Call of Duty: Modern Warfare III",
      developers: ["Sledgehammer Games", "Infinity Ward"],
      publishers: ["Activision"],
      genres: [{ id: "1", description: "Action" }],
      is_free: false,
      price_overview: { final_formatted: "$69.99" },
      header_image:
        "https://cdn.akamai.steamstatic.com/steam/apps/1985810/header.jpg",
      steam_url: "https://store.steampowered.com/app/1985810/",
    },
  };

  // Simple name matching (case insensitive)
  const normalizedName = gameName.toLowerCase();
  for (const [key, value] of Object.entries(mockSteamData)) {
    if (
      key.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(key.toLowerCase())
    ) {
      return value;
    }
  }

  // If no exact match, return a generic response
  return {
    steam_appid: 999999,
    name: gameName,
    short_description: `A game called ${gameName}`,
    developers: ["Unknown Developer"],
    publishers: ["Unknown Publisher"],
    genres: [{ id: "1", description: "Action" }],
    is_free: false,
    price_overview: { final_formatted: "$19.99" },
    header_image: "",
    steam_url: `https://store.steampowered.com/search/?term=${encodeURIComponent(
      gameName
    )}`,
  };
};

// Detect if a game is indie (simple heuristic)
const detectIndieStatus = (steamData: any): boolean => {
  const indiePublishers = [
    "InnerSloth",
    "Team Cherry",
    "Supergiant Games",
    "Devolver Digital",
  ];

  const isSmallPublisher = indiePublishers.some((pub) =>
    steamData.publishers?.some((p: string) => p.includes(pub))
  );
  const isLowPrice =
    parseFloat(
      steamData.price_overview?.final_formatted?.replace("$", "") || "0"
    ) < 30;

  return isSmallPublisher || isLowPrice;
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { query } = await request.json();

    console.log(`🎮 Similar games API called:`, {
      query: query || "(empty)",
      queryType: typeof query,
      timestamp: new Date().toISOString()
    });

    if (!query || typeof query !== "string") {
      console.log(`❌ Invalid query parameter:`, { query, type: typeof query });
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    // Extract game name from query
    const gameName = extractGameName(query);
    console.log(`🔍 Game name extraction:`, {
      originalQuery: query,
      extractedGameName: gameName,
      extractionSuccessful: !!gameName
    });

    if (!gameName) {
      console.log(`❌ Could not extract game name from query: "${query}"`);
      return NextResponse.json(
        { error: "Could not extract game name from query" },
        { status: 400 }
      );
    }

    console.log(`🔎 Looking up Steam data for: "${gameName}"`);
    
    // Get Steam data
    const steamData = await searchSteamGame(gameName);
    const isIndie = detectIndieStatus(steamData);

    console.log(`📊 Steam data analysis:`, {
      gameName: steamData.name,
      steamAppId: steamData.steam_appid,
      developers: steamData.developers,
      publishers: steamData.publishers,
      price: steamData.price_overview?.final_formatted,
      isIndie,
      indieDetectionReasons: {
        hasSmallPublisher: steamData.publishers?.some((p: string) => 
          ["InnerSloth", "Team Cherry", "Supergiant Games", "Devolver Digital"].some(indie => p.includes(indie))
        ),
        isLowPrice: parseFloat(steamData.price_overview?.final_formatted?.replace("$", "") || "0") < 30
      }
    });

    console.log(`🔍 Searching for similar games using: "${steamData.name}"`);
    
    // For now, return mock similar games using existing search
    const { searchGames } = await import("@/lib/search");
    const similarGames = await searchGames(steamData.name);

    console.log(`✅ Similar games search completed:`, {
      referenceGame: steamData.name,
      isIndie,
      isHidden: !isIndie,
      similarGamesFound: similarGames.length,
      topResults: similarGames.slice(0, 3).map(game => ({
        title: game.title,
        similarity: game.similarity
      })),
      processingTime: Date.now() - startTime + "ms"
    });

    return NextResponse.json({
      referenceGame: {
        name: steamData.name,
        isIndie,
        steamUrl: steamData.steam_url,
        isHidden: !isIndie,
      },
      similarGames: similarGames.slice(0, 10), // Limit results
      wasNewReference: true,
      query,
      count: similarGames.length,
    });
  } catch (error) {
    console.error("❌ Similar games API error:", {
      error: error.message,
      stack: error.stack,
      query: query || "(empty)",
      processingTime: Date.now() - startTime + "ms"
    });
    return NextResponse.json(
      { error: "Failed to find similar games", games: [] },
      { status: 500 }
    );
  }
}
