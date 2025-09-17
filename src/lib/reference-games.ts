import { embed } from "ai";
import fs from "fs";
import path from "path";
import { ReferenceGame, AIMetadata } from "./types";

const embeddingModel = "openai/text-embedding-3-small";

const loadReferenceGames = async (): Promise<ReferenceGame[]> => {
  const filePath = path.join(process.cwd(), "public/data/reference-games.json");
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = await fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
};

const saveReferenceGames = async (games: ReferenceGame[]): Promise<void> => {
  const filePath = path.join(process.cwd(), "public/data/reference-games.json");
  await fs.writeFileSync(filePath, JSON.stringify(games, null, 2));
};

// Extract game name from "games like X" queries
export const extractGameName = (query: string): string => {
  return query
    .replace(/^(games?\s+)?(like|similar to)\s+/i, "")
    .replace(/\s+(games?)?\s*$/i, "")
    .trim();
};

// Simple Steam API simulation (for prototyping)
export const searchSteamGame = async (gameName: string): Promise<any> => {
  // For prototyping, we'll simulate Steam data
  // In production, this would call Steam API

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
    PEAK: {
      steam_appid: 271590,
      name: "Grand Theft Auto V",
      short_description:
        "Grand Theft Auto V for PC offers players the option to explore the award-winning world of Los Santos and Blaine County",
      developers: ["Rockstar North"],
      publishers: ["Rockstar Games"],
      genres: [{ id: "1", description: "Action" }],
      is_free: false,
      price_overview: { final_formatted: "$29.99" },
      header_image:
        "https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg",
      steam_url: "https://store.steampowered.com/app/271590/",
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
export const detectIndieStatus = (steamData: any): boolean => {
  const indiePublishers = [
    "InnerSloth",
    "Team Cherry",
    "Supergiant Games",
    "Devolver Digital",
  ];
  const indieDevelopers = ["InnerSloth", "Team Cherry", "Supergiant Games"];

  const isSmallPublisher = indiePublishers.some((pub) =>
    steamData.publishers?.some((p: string) => p.includes(pub))
  );
  const isSmallDeveloper = indieDevelopers.some((dev) =>
    steamData.developers?.some((d: string) => d.includes(dev))
  );
  const isLowPrice =
    parseFloat(
      steamData.price_overview?.final_formatted?.replace("$", "") || "0"
    ) < 30;

  return isSmallPublisher || isSmallDeveloper || isLowPrice;
};

// Generate AI metadata for reference game
export const generateReferenceMetadata = async (
  steamData: any
): Promise<AIMetadata> => {
  // For prototyping, we'll create basic metadata
  // In production, this would use AI to generate rich metadata

  return {
    summary: steamData.short_description,
    gameTitles: [steamData.name],
    genres: steamData.genres?.map((g: any) => g.description) || [],
    keyFeatures: ["Multiplayer", "Online", "Action"], // Simplified
    targetAudience: "General gamers",
    releaseStatus: "Released",
    mood: ["exciting", "competitive"],
    vibe: ["intense", "social"],
    atmosphere: ["dynamic", "engaging"],
    playStyle: ["multiplayer", "strategic"],
    socialContext: ["online multiplayer"],
    difficultyLevel: "moderate",
    emotionalTone: ["exciting", "challenging"],
    settingAesthetics: ["modern", "realistic"],
    gameplayFeel: ["responsive", "immersive"],
    playModes: ["multiplayer"],
    coreMechanics: ["action", "strategy"],
    cameraPerspective: ["third-person"],
    artStyle: ["realistic"],
    visualStyle: ["detailed"],
    controlScheme: ["keyboard and mouse"],
    sessionLength: ["medium"],
    complexity: "moderate",
    multiplayerFeatures: ["online multiplayer"],
    contentRating: "teen",
    platformSupport: ["Windows"],
    languageSupport: ["English"],
    accessibility: ["subtitles"],
    performance: ["optimized"],
  };
};

// Create or get reference game
export const getOrCreateReferenceGame = async (
  gameName: string
): Promise<{
  referenceGame: ReferenceGame;
  wasNew: boolean;
}> => {
  const referenceGames = await loadReferenceGames();

  // Check if reference game already exists
  const existing = referenceGames.find(
    (rg) =>
      rg.name.toLowerCase().includes(gameName.toLowerCase()) ||
      gameName.toLowerCase().includes(rg.name.toLowerCase())
  );

  if (existing) {
    return { referenceGame: existing, wasNew: false };
  }

  // Get Steam data
  const steamData = await searchSteamGame(gameName);
  const isIndie = detectIndieStatus(steamData);

  // Generate embedding
  const { embedding } = await embed({
    model: embeddingModel,
    value: `${steamData.name} ${steamData.short_description}`,
  });

  // Generate metadata
  const metadata = await generateReferenceMetadata(steamData);

  // Create new reference game
  const newReferenceGame: ReferenceGame = {
    id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    steamAppId: steamData.steam_appid,
    name: steamData.name,
    description: steamData.short_description,
    isIndie,
    isHidden: !isIndie, // Hide non-indie games from public lists
    metadata,
    embedding,
    steamUrl:
      steamData.steam_url ||
      `https://store.steampowered.com/app/${steamData.steam_appid}/`,
    createdAt: new Date().toISOString(),
  };

  // Save to file
  referenceGames.push(newReferenceGame);
  await saveReferenceGames(referenceGames);

  return { referenceGame: newReferenceGame, wasNew: true };
};

// Find similar games using reference game embedding
export const findSimilarGames = async (
  referenceGame: ReferenceGame,
  limit: number = 20
): Promise<any[]> => {
  if (!referenceGame.embedding) {
    return [];
  }

  // Load existing game data (from our current system)
  const { loadEmbeddedData } = await import("./search");
  const tweets = await loadEmbeddedData();

  // Calculate similarities
  const cosineSimilarity = (a: number[], b: number[]): number => {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  };

  const gamesWithSimilarity = tweets
    .filter((tweet) => tweet.steamProfiles && tweet.steamProfiles.length > 0)
    .flatMap((tweet) =>
      tweet.steamProfiles!.map((game) => {
        const rawData = game.rawData;
        return {
          appId: game.appId,
          title: rawData.name,
          description: rawData.short_description,
          price:
            rawData.price_overview?.final_formatted ||
            (rawData.is_free ? "Free" : "N/A"),
          tags: rawData.genres?.map((g: any) => g.description) || [],
          releaseDate: rawData.release_date?.date || "",
          developer: rawData.developers?.join(", ") || "",
          publisher: rawData.publishers?.join(", ") || "",
          images: [
            rawData.header_image || "",
            ...(rawData.screenshots?.slice(0, 4).map((s: any) => s.path_full) ||
              []),
          ].filter(Boolean),
          videos:
            rawData.movies?.slice(0, 2).map((m: any) => m.mp4?.max || m.mp4) ||
            [],
          tweetId: tweet.id,
          tweetAuthor: tweet.author.userName,
          tweetText: tweet.fullText || tweet.text,
          aiMetadata: tweet.aiMetadata,
          tweetUrl: tweet.url,
          similarity: cosineSimilarity(
            referenceGame.embedding!,
            tweet.embedding!
          ),
        };
      })
    )
    .filter((item) => item.similarity > 0.15) // Similarity threshold
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return gamesWithSimilarity;
};
