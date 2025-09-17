import { embed } from "ai";
import fs from "fs";
import path from "path";
import { OUTPUT_FILE as METADATA_OUTPUT_FILE } from "./2-generate-metadata";
import { EnrichedTweet } from "../types";
import models from "@/lib/ai/models";

export const OUTPUT_FILE = "embed-results.json";

async function main() {
  const metadataFile = path.join(
    __dirname,
    "../../../public/data",
    METADATA_OUTPUT_FILE
  );
  const tweetsWithSemanticText: EnrichedTweet[] = JSON.parse(
    fs.readFileSync(metadataFile, "utf-8")
  );

  console.log(`Embedding ${tweetsWithSemanticText.length} tweets...`);

  const tweetsWithEmbeddings = [];

  for (const tweet of tweetsWithSemanticText) {
    if (!tweet.semantic_text_for_embedding) {
      console.warn(`Skipping tweet ${tweet.id} due to missing semantic text.`);
      continue;
    }

    try {
      console.log(
        `Embedding tweet ${tweetsWithSemanticText.indexOf(tweet) + 1}/${
          tweetsWithSemanticText.length
        }`
      );

      const { embedding } = await embed({
        model: models.embeddingModel,
        value: tweet.semantic_text_for_embedding,
      });

      tweetsWithEmbeddings.push({
        ...tweet,
        embedding,
      });
    } catch (error) {
      console.error(`Error embedding tweet ${tweet.id}:`, error);
    }
  }

  const outputFile = path.join(__dirname, "../../../public/data", OUTPUT_FILE);
  fs.writeFileSync(outputFile, JSON.stringify(tweetsWithEmbeddings, null, 2));

  console.log(
    `Embedded ${tweetsWithEmbeddings.length} tweets and saved to ${outputFile}`
  );
}

if (require.main === module) {
  main().catch(console.error);
}
