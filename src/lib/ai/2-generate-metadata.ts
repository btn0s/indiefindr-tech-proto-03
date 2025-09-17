import { generateObject } from "ai";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { OUTPUT_FILE as ENRICHED_OUTPUT_FILE } from "./1-enrich";

const MODEL = "openai/gpt-4o";
export const OUTPUT_FILE = "metadata-results.json";

interface EnrichedTweet {
  id: string;
  author: {
    userName: string;
    url: string;
  };
  entities?: {
    urls?: Array<{
      expanded_url: string;
    }>;
  };
  steamProfiles?: Array<{
    appId: string;
    title: string;
    description: string;
    price: string;
    tags: string[];
    releaseDate: string;
    developer: string;
    publisher: string;
    images: string[];
  }>;
  // Include all original tweet data
  text?: string;
  fullText?: string;
  createdAt?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  url?: string;
  extendedEntities?: any;
  isQuote?: boolean;
  quote?: any;
}

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
        (game) =>
          `Game: ${game.title}\nDescription: ${
            game.description
          }\nTags: ${game.tags.join(", ")}\nDeveloper: ${
            game.developer
          }\nPublisher: ${game.publisher}`
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
- Think beyond genres - focus on what it FEELS like to play these games
- Consider the emotional journey and atmosphere
- Identify social contexts (couch co-op, solo meditation, party games, etc.)
- Capture aesthetic and sensory qualities
- Use evocative language that helps people imagine the experience
- For queries like "warm games to play on the couch" or "game night coop", your metadata should enable semantic matching

Examples of good experiential descriptors:
- Mood: "meditative", "heart-pounding", "melancholic", "joyful"
- Vibe: "cozy blanket fort", "late-night diner", "summer afternoon", "rainy day"
- Atmosphere: "warm candlelight", "neon-soaked streets", "misty forest"
- Social: "snuggled up together", "competitive banter", "shared discovery"
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
