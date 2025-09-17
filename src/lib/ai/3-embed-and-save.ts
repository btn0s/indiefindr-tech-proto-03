import { embed } from "ai";
import fs from "fs";
import path from "path";
import { OUTPUT_FILE as METADATA_OUTPUT_FILE } from "./2-generate-metadata";

const embeddingModel = "openai/text-embedding-3-small";
const OUTPUT_FILE = "embed-results.json";

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

interface EmbeddedTweet {
  id: string;
  summary: string;
  gameTitles: string[];
  genres: string[];
  keyFeatures: string[];
  targetAudience: string;
  releaseStatus: string;
  embedding: number[];
}

const loadMetadataFile = async (): Promise<TweetMetadata[]> => {
  const filePath = path.join(
    __dirname,
    "../../../public/data",
    METADATA_OUTPUT_FILE
  );
  const rawFile = await fs.promises.readFile(filePath, { encoding: "utf-8" });
  return JSON.parse(rawFile);
};

const writeEmbeddedData = async (
  embeddedTweets: EmbeddedTweet[],
  outputPath: string
) => {
  try {
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(embeddedTweets, null, 2)
    );
    console.log(`All embedded data written to ${outputPath}`);
  } catch (error) {
    console.error("Error writing embedded data to file:", error);
    throw error;
  }
};

async function main() {
  // Load metadata from previous step
  const tweetsWithMetadata = await loadMetadataFile();

  console.log(`Processing ${tweetsWithMetadata.length} tweets for embedding`);

  const embeddedTweets: EmbeddedTweet[] = [];

  for (const tweet of tweetsWithMetadata) {
    console.clear();
    console.log(
      `Generating embedding for tweet ${tweet.id} (${
        tweetsWithMetadata.indexOf(tweet) + 1
      }/${tweetsWithMetadata.length})`
    );

    try {
      // Create a comprehensive text for embedding
      const embeddingText = [
        tweet.metadata.summary,
        `Games: ${tweet.metadata.gameTitles.join(", ")}`,
        `Genres: ${tweet.metadata.genres.join(", ")}`,
        `Features: ${tweet.metadata.keyFeatures.join(", ")}`,
        `Target: ${tweet.metadata.targetAudience}`,
        `Status: ${tweet.metadata.releaseStatus}`,
      ].join("\n");

      // Generate embedding
      const { embedding } = await embed({
        model: embeddingModel,
        value: embeddingText,
      });

      embeddedTweets.push({
        id: tweet.id,
        summary: tweet.metadata.summary,
        gameTitles: tweet.metadata.gameTitles,
        genres: tweet.metadata.genres,
        keyFeatures: tweet.metadata.keyFeatures,
        targetAudience: tweet.metadata.targetAudience,
        releaseStatus: tweet.metadata.releaseStatus,
        embedding,
      });
    } catch (error) {
      console.error(`Error processing tweet ${tweet.id}:`, error);
    }
  }

  // Save embedded data to JSON file
  const outputPath = path.join(__dirname, "../../../public/data", OUTPUT_FILE);
  await writeEmbeddedData(embeddedTweets, outputPath);

  console.log("Successfully embedded and saved all tweets!");
  console.log(`Total tweets processed: ${embeddedTweets.length}`);
  console.log(
    `Embedding dimensions: ${embeddedTweets[0]?.embedding.length || 0}`
  );
}

main().catch(console.error);
