import { generateText } from "ai";
import fs from "fs";
import path from "path";
import { OUTPUT_FILE as ENRICHED_OUTPUT_FILE } from "./1-enrich";
import { EnrichedTweet } from "../types";
import models from "@/lib/ai/models";

export const OUTPUT_FILE = "metadata-results.json";

// The new, simpler structure. We only add the semantic text here.
interface TweetWithSemanticText extends EnrichedTweet {
  semantic_text_for_embedding: string;
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
  metadataArray: TweetWithSemanticText[],
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

  const tweetsWithMetadata: TweetWithSemanticText[] = [];

  for (const tweet of tweetsWithSteamGames) {
    console.clear();
    console.log(
      `Generating semantic text for tweet ${tweet.id} (${
        tweetsWithSteamGames.indexOf(tweet) + 1
      }/${tweetsWithSteamGames.length})`
    );

    const steamGames = tweet.steamProfiles!;
    const gamesContext = steamGames
      .map(
        (game) => `
          Game: ${game.rawData.name}
          Description: ${game.rawData.short_description}
          Genres: ${
            game.rawData.genres?.map((g: any) => g.description).join(", ") ||
            "N/A"
          }
          Categories: ${
            game.rawData.categories
              ?.map((c: any) => c.description)
              .join(", ") || "N/A"
          }
          Developer: ${game.rawData.developers?.join(", ") || "N/A"}
        `
      )
      .join("\n\n");

    try {
      const { text: semanticText } = await generateText({
        model: models.chatModel,
        system:
          "You are an expert indie game curator. Your task is to generate a compelling, evocative, and keyword-rich paragraph that captures the essence and vibe of a game for a semantic search engine. Weave in the key genres, mechanics, and play styles to create a description that would help a player understand what it *feels* like to play. Focus on the vibe, not just a dry list of features.",
        prompt: `
<role>
You are an expert indie game curator who specializes in understanding the emotional and experiential qualities of games. You help people find games based on feelings, moods, and experiences they want to have.
</role>

<task>
Analyze the provided tweet and Steam game data to generate a single, dense paragraph of descriptive text for a semantic search embedding. This text should capture the game's core identity, vibe, and intended player experience.
</task>

<data>
Tweet: "${tweet.fullText || tweet.text}"
---
Steam Game Details:
${gamesContext}
</data>

<instructions>
1.  Synthesize the tweet and Steam data into a single, flowing paragraph.
2.  Start with the genre and core identity (e.g., "A cozy, open-world farming sim...").
3.  Weave in the primary gameplay mechanics and what the player *does* (e.g., "...where you'll explore, craft, and build relationships...").
4.  Describe the mood, atmosphere, and emotional tone (e.g., "...in a relaxing, whimsical world filled with charming characters.").
5.  Mention the intended social context (e.g., "Perfect for a solo adventure or relaxing with friends in online co-op.").
6.  The final text should be a rich, descriptive summary optimized for semantic understanding. Do not use markdown or lists.
</instructions>

Generate the semantic paragraph now.`,
      });

      tweetsWithMetadata.push({
        ...tweet,
        semantic_text_for_embedding: semanticText.replaceAll("\n", " ").trim(),
      });
    } catch (error) {
      console.error(`Error processing tweet ${tweet.id}:`, error);
    }
  }

  const outputPath = path.join(__dirname, "../../../public/data", OUTPUT_FILE);
  await writeAllMetadataToFile(tweetsWithMetadata, outputPath);
  console.log("All tweets processed!");
}

if (require.main === module) {
  main().catch(console.error);
}
