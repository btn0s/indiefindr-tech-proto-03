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
}

interface TweetMetadata {
  id: string;
  metadata: {
    summary: string;
    gameTitles: string[];
    genres: string[];
    keyFeatures: string[];
    targetAudience: string;
    releaseStatus: string;
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
          }),
        }),
        messages: [
          {
            role: "user",
            content: `Analyze this tweet about indie games and generate metadata. Here are the Steam game details:

${gamesContext}

Generate structured metadata for this tweet about indie games.`,
          },
        ],
      });

      tweetsWithMetadata.push({
        id: tweet.id,
        metadata: result.object.metadata,
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
