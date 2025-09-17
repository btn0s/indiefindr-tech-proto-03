import { embed } from "ai";
import fs from "fs";
import path from "path";
import { OUTPUT_FILE as METADATA_OUTPUT_FILE } from "./2-generate-metadata";

const embeddingModel = "openai/text-embedding-3-small";
const OUTPUT_FILE = "embed-results.json";

interface TweetWithMetadata {
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

interface FinalTweet extends TweetWithMetadata {
  embedding: number[];
}

const loadMetadataFile = async (): Promise<TweetWithMetadata[]> => {
  const filePath = path.join(
    __dirname,
    "../../../public/data",
    METADATA_OUTPUT_FILE
  );
  const rawFile = await fs.promises.readFile(filePath, { encoding: "utf-8" });
  return JSON.parse(rawFile);
};

const writeEmbeddedData = async (
  finalTweets: FinalTweet[],
  outputPath: string
) => {
  try {
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(finalTweets, null, 2)
    );
    console.log(`All final data written to ${outputPath}`);
  } catch (error) {
    console.error("Error writing final data to file:", error);
    throw error;
  }
};

async function main() {
  // Load metadata from previous step
  const tweetsWithMetadata = await loadMetadataFile();

  console.log(`Processing ${tweetsWithMetadata.length} tweets for embedding`);

  const finalTweets: FinalTweet[] = [];

  for (const tweet of tweetsWithMetadata) {
    console.clear();
    console.log(
      `Generating embedding for tweet ${tweet.id} (${
        tweetsWithMetadata.indexOf(tweet) + 1
      }/${tweetsWithMetadata.length})`
    );

    try {
      // Create a comprehensive text for embedding that includes experiential metadata
      const embeddingText = [
        tweet.aiMetadata.summary,
        `Games: ${tweet.aiMetadata.gameTitles.join(", ")}`,
        `Genres: ${tweet.aiMetadata.genres.join(", ")}`,
        `Features: ${tweet.aiMetadata.keyFeatures.join(", ")}`,
        `Target: ${tweet.aiMetadata.targetAudience}`,
        `Status: ${tweet.aiMetadata.releaseStatus}`,
        // Enhanced experiential metadata for better semantic search
        `Mood: ${tweet.aiMetadata.mood?.join(", ") || ""}`,
        `Vibe: ${tweet.aiMetadata.vibe?.join(", ") || ""}`,
        `Atmosphere: ${tweet.aiMetadata.atmosphere?.join(", ") || ""}`,
        `Play Style: ${tweet.aiMetadata.playStyle?.join(", ") || ""}`,
        `Social Context: ${tweet.aiMetadata.socialContext?.join(", ") || ""}`,
        `Difficulty: ${tweet.aiMetadata.difficultyLevel || ""}`,
        `Emotional Tone: ${tweet.aiMetadata.emotionalTone?.join(", ") || ""}`,
        `Aesthetics: ${tweet.aiMetadata.settingAesthetics?.join(", ") || ""}`,
        `Gameplay Feel: ${tweet.aiMetadata.gameplayFeel?.join(", ") || ""}`,
      ]
        .filter((line) => line.trim() && !line.endsWith(": "))
        .join("\n");

      // Generate embedding
      const { embedding } = await embed({
        model: embeddingModel,
        value: embeddingText,
      });

      // Create final tweet with all data + embedding
      finalTweets.push({
        ...tweet, // All original tweet data + Steam data + AI metadata
        embedding,
      });
    } catch (error) {
      console.error(`Error processing tweet ${tweet.id}:`, error);
    }
  }

  // Save final data to JSON file
  const outputPath = path.join(__dirname, "../../../public/data", OUTPUT_FILE);
  await writeEmbeddedData(finalTweets, outputPath);

  console.log("Successfully embedded and saved all tweets!");
  console.log(`Total tweets processed: ${finalTweets.length}`);
  console.log(`Embedding dimensions: ${finalTweets[0]?.embedding.length || 0}`);
}

// Only run if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}
