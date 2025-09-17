import { generateObject } from "ai";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { OUTPUT_FILE as ENRICHED_OUTPUT_FILE } from "./1-enrich";
import { EnrichedTweet } from "../types";

const MODEL = "openai/gpt-4o";
export const OUTPUT_FILE = "metadata-results.json";

interface TweetMetadata extends EnrichedTweet {
  aiMetadata: {
    summary: string;
    gameTitles: string[];
    genres: string[];
    keyFeatures: string[];
    targetAudience: string;
    releaseStatus: string;
    // Enhanced fields for natural language search
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
  };
}

const loadEnrichedTweets = async (): Promise<EnrichedTweet[]> => {
  const filePath = path.join(
    __dirname,
    "../../../public/data",
    ENRICHED_OUTPUT_FILE
  );
  const rawFile = await fs.promises.readFile(filePath, { encoding: "utf-8" });
  return JSON.parse(rawFile);
};

const writeAllMetadataToFile = async (
  metadataArray: TweetMetadata[],
  outputPath: string
) => {
  try {
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(metadataArray, null, 2)
    );
    console.log(`All metadata written to ${outputPath}`);
  } catch (error) {
    console.error("Error writing metadata to file:", error);
    throw error;
  }
};

async function main() {
  const enrichedTweets = await loadEnrichedTweets();
  const tweetsWithSteamGames = enrichedTweets.filter(
    (tweet) => tweet.steamProfiles && tweet.steamProfiles.length > 0
  );

  console.log(
    `Processing ${tweetsWithSteamGames.length} tweets with Steam games`
  );

  const tweetsWithMetadata: TweetMetadata[] = [];

  for (const tweet of tweetsWithSteamGames) {
    console.clear();
    console.log(
      `Generating metadata for tweet ${tweet.id} (${
        tweetsWithSteamGames.indexOf(tweet) + 1
      }/${tweetsWithSteamGames.length})`
    );

    const steamGames = tweet.steamProfiles!;
    const gamesContext = steamGames
      .map(
        (game) => `
Game: ${game.rawData.name}
Description: ${game.rawData.short_description}
Full Description: ${
          game.rawData.detailed_description || game.rawData.about_the_game || ""
        }
Genres: ${
          game.rawData.genres?.map((g: any) => g.description).join(", ") ||
          "N/A"
        }
Categories: ${
          game.rawData.categories?.map((c: any) => c.description).join(", ") ||
          "N/A"
        }
Platforms: ${Object.keys(game.rawData.platforms || {}).join(", ")}
Developer: ${game.rawData.developers?.join(", ") || "N/A"}
Publisher: ${game.rawData.publishers?.join(", ") || "N/A"}
Price: ${
          game.rawData.price_overview?.final_formatted ||
          (game.rawData.is_free ? "Free" : "N/A")
        }
Release Date: ${game.rawData.release_date?.date || "N/A"}
Metacritic Score: ${game.rawData.metacritic?.score || "N/A"}
Content Descriptors: ${
          game.rawData.content_descriptors?.ids?.join(", ") || "None"
        }
Supported Languages: ${Object.keys(game.rawData.supported_languages || {}).join(
          ", "
        )}
Website: ${game.rawData.website || "N/A"}
Screenshots: ${game.rawData.screenshots?.length || 0} available
Videos: ${game.rawData.movies?.length || 0} available
Controller Support: ${game.rawData.controller_support || "N/A"}
Required Age: ${game.rawData.required_age || "N/A"}
Type: ${game.rawData.type || "N/A"}
Background: ${game.rawData.background || ""}`
      )
      .join("\n\n");

    try {
      const result = await generateObject({
        model: MODEL,
        schema: z.object({
          metadata: z.object({
            summary: z
              .string()
              .describe("A concise summary of what this tweet is about"),
            gameTitles: z
              .array(z.string())
              .describe("List of game titles mentioned"),
            genres: z.array(z.string()).describe("Game genres/tags identified"),
            keyFeatures: z
              .array(z.string())
              .describe("Key features or selling points mentioned"),
            targetAudience: z
              .string()
              .describe("Who this game appears to target"),
            releaseStatus: z
              .string()
              .describe(
                "Release status (e.g., 'Upcoming', 'Early Access', 'Released')"
              ),
            // Enhanced fields for natural language search
            mood: z
              .array(z.string())
              .describe(
                "Emotional moods the game evokes (e.g., 'relaxing', 'tense', 'melancholic', 'uplifting', 'mysterious')"
              ),
            vibe: z
              .array(z.string())
              .describe(
                "Overall vibes and feelings (e.g., 'cozy', 'nostalgic', 'epic', 'intimate', 'chaotic', 'peaceful')"
              ),
            atmosphere: z
              .array(z.string())
              .describe(
                "Environmental/setting atmosphere (e.g., 'warm', 'dark', 'whimsical', 'gritty', 'magical', 'cyberpunk')"
              ),
            playStyle: z
              .array(z.string())
              .describe(
                "How the game is meant to be played (e.g., 'casual', 'hardcore', 'bite-sized sessions', 'marathon sessions', 'mindful')"
              ),
            socialContext: z
              .array(z.string())
              .describe(
                "Social play context (e.g., 'solo experience', 'couch co-op', 'game night', 'party game', 'online multiplayer', 'family-friendly')"
              ),
            difficultyLevel: z
              .string()
              .describe(
                "Difficulty level (e.g., 'accessible', 'moderate', 'challenging', 'punishing')"
              ),
            emotionalTone: z
              .array(z.string())
              .describe(
                "Emotional experiences (e.g., 'heartwarming', 'thought-provoking', 'adrenaline-pumping', 'zen', 'bittersweet')"
              ),
            settingAesthetics: z
              .array(z.string())
              .describe(
                "Visual and aesthetic qualities (e.g., 'pixel art', 'hand-drawn', 'minimalist', 'lush', 'colorful', 'monochrome')"
              ),
            gameplayFeel: z
              .array(z.string())
              .describe(
                "Physical/tactile gameplay sensations (e.g., 'smooth', 'responsive', 'weighty', 'floaty', 'precise', 'fluid')"
              ),
            // First-principles game attributes
            playModes: z
              .array(z.string())
              .describe(
                "Play modes available (e.g., 'single-player', 'local co-op', 'online multiplayer', 'split-screen', 'couch co-op')"
              ),
            coreMechanics: z
              .array(z.string())
              .describe(
                "Core gameplay mechanics with specific action words (e.g., 'shooting', 'fighting', 'platforming', 'puzzle-solving', 'resource management', 'combat', 'exploration', 'crafting', 'driving', 'flying', 'sailing', 'building', 'trading', 'stealth', 'racing')"
              ),
            cameraPerspective: z
              .array(z.string())
              .describe(
                "Camera/view perspective (e.g., 'first-person', 'third-person', 'top-down', 'side-scrolling', 'isometric', '2D platformer')"
              ),
            artStyle: z
              .array(z.string())
              .describe(
                "Artistic style and aesthetics (e.g., 'pixel art', 'hand-drawn', '3D realistic', 'low-poly', 'retro', 'anime', 'cel-shaded')"
              ),
            visualStyle: z
              .array(z.string())
              .describe(
                "Visual presentation style (e.g., 'dark and moody', 'bright and colorful', 'minimalist', 'detailed', 'stylized', 'photorealistic')"
              ),
            controlScheme: z
              .array(z.string())
              .describe(
                "Control input methods (e.g., 'keyboard and mouse', 'gamepad', 'touch', 'motion controls', 'point and click')"
              ),
            sessionLength: z
              .array(z.string())
              .describe(
                "Typical session duration (e.g., 'quick sessions', 'long-form', 'endless', 'campaign-based', 'bite-sized')"
              ),
            complexity: z
              .string()
              .describe(
                "Overall complexity level (e.g., 'simple and accessible', 'moderate depth', 'deep systems', 'hardcore simulation')"
              ),
            multiplayerFeatures: z
              .array(z.string())
              .describe(
                "Multiplayer functionality (e.g., 'cooperative', 'competitive', 'asymmetric', 'team-based', 'versus mode')"
              ),
            contentRating: z
              .string()
              .describe(
                "Content rating and maturity (e.g., 'family-friendly', 'teen', 'mature', 'violence', 'language', 'sexual content')"
              ),
            platformSupport: z
              .array(z.string())
              .describe(
                "Supported platforms (e.g., 'PC', 'Mac', 'Linux', 'Steam Deck', 'VR', 'mobile')"
              ),
            languageSupport: z
              .array(z.string())
              .describe(
                "Supported languages (e.g., 'English', 'Spanish', 'French', 'Japanese', 'Chinese', 'Russian')"
              ),
            accessibility: z
              .array(z.string())
              .describe(
                "Accessibility features (e.g., 'colorblind support', 'subtitles', 'one-handed play', 'adjustable difficulty', 'text size options')"
              ),
            performance: z
              .array(z.string())
              .describe(
                "Performance characteristics (e.g., 'lightweight', 'high-end graphics', '60fps', 'ray tracing', 'optimized for low-end PCs')"
              ),
          }),
        }),
        messages: [
          {
            role: "user",
            content: `<role>
You are an expert indie game curator who specializes in understanding the emotional and experiential qualities of games. You help people find games based on feelings, moods, and experiences they want to have.
</role>

<task>
Analyze this tweet about indie games and generate rich experiential metadata. Focus on the FEELINGS, VIBES, and EXPERIENCES these games offer, not just technical features.
</task>

<game_details>
${gamesContext}
</game_details>

<instructions>
You are analyzing comprehensive Steam game data to create rich, searchable metadata. Use ALL available information to create detailed profiles that enable semantic search for natural language queries.

Key Analysis Areas:
1. FEELINGS & EXPERIENCES: What does it feel like to play? Emotional journey, atmosphere, social contexts
2. FIRST-PRINCIPLES ATTRIBUTES: Core mechanics, play modes, camera perspective, art style, controls
3. GAMEPLAY MECHANICS: Be VERY specific about what players DO (shooting, fighting, driving, flying, building, etc.)
4. TECHNICAL SPECS: Platforms, languages, accessibility, performance characteristics
5. SOCIAL CONTEXTS: Single-player, couch co-op, online multiplayer, party games, family-friendly

CRITICAL: For coreMechanics, use ACTION VERBS that describe what players actually do:
- "shooting" for FPS/shooter games
- "fighting" or "combat" for action games
- "driving" for racing games
- "flying" for flight simulators
- "building" for construction games
- "stealth" for sneaking games
- "exploration" for open-world games
- "puzzle-solving" for puzzle games

Use the rich Steam data provided:
- Categories and tags to understand game mechanics and genre
- Full descriptions to capture atmosphere and tone
- Metacritic scores for quality indicators
- Content descriptors for maturity and content warnings
- Platform support for accessibility and compatibility
- Language support for global reach

Examples of good descriptors:
- Mood: "meditative", "heart-pounding", "melancholic", "joyful"
- Vibe: "cozy blanket fort", "late-night diner", "summer afternoon", "rainy day"
- Play Modes: "couch co-op", "split-screen", "online competitive", "solo adventure"
- Art Style: "pixel art", "hand-drawn", "low-poly", "retro PSX", "cel-shaded"
- Mechanics: "puzzle-solving", "platforming", "resource management", "tactical combat"

For queries like "warm games to play on the couch" or "game night coop", your metadata should enable semantic matching through comprehensive experiential and technical analysis.
</instructions>

Generate comprehensive experiential metadata for this indie game content.`,
          },
        ],
      });

      tweetsWithMetadata.push({
        ...tweet, // Preserve all original tweet data
        aiMetadata: result.object.metadata,
      });
    } catch (error) {
      console.error(`Error processing tweet ${tweet.id}:`, error);
    }
  }

  const outputPath = path.join(__dirname, "../../../public/data", OUTPUT_FILE);
  await writeAllMetadataToFile(tweetsWithMetadata, outputPath);
  console.log("All tweets processed!");
}

// Only run if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}
