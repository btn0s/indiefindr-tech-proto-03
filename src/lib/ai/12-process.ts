import fs from "fs";
import path from "path";
import { embed, generateText } from "ai";
import models from "./models";
import dEnv from "../dotenv";

dEnv();

const INPUT_FILE = "enhanced-results.json";
const OUTPUT_FILE = "embed-results.json";

interface EnhancedGame {
  appId: string;
  steamDetails?: any;
  enhancementError?: string;
}

interface ProcessedGame {
  appId: string;
  name: string;
  semantic_description: string;
  embedding: number[];
  steam_data: any;
}

async function generateSemanticDescription(steamData: any): Promise<string> {
  const description =
    steamData.short_description || steamData.detailed_description || "";
  const cleanDescription = description
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const context = `
Game: ${steamData.name}
Genres: ${(steamData.genres || []).map((g: any) => g.description).join(", ")}
Description: ${cleanDescription}
`.trim();

  try {
    const { text } = await generateText({
      model: models.chatModelMini,
      temperature: 0.3,
      system:
        "Create a rich semantic description for indie game search. Focus on gameplay, mechanics, and style.",
      prompt: context,
    });
    return text;
  } catch (error) {
    console.error(`Failed to generate description for ${steamData.name}`);
    return cleanDescription;
  }
}

const main = async () => {
  console.log("Processing enhanced games for new search system...");

  const inputPath = path.join(__dirname, "../../../public/data", INPUT_FILE);
  const outputPath = path.join(__dirname, "../../../public/data", OUTPUT_FILE);

  const enhancedGames: EnhancedGame[] = JSON.parse(
    fs.readFileSync(inputPath, "utf8")
  );
  const validGames = enhancedGames.filter(
    (g) => g.steamDetails && !g.enhancementError
  );

  console.log(`Processing ${validGames.length} games...`);

  const processedGames: ProcessedGame[] = [];

  for (const [index, game] of validGames.entries()) {
    console.log(
      `[${index + 1}/${validGames.length}] ${game.steamDetails.name}`
    );

    try {
      const semanticDescription = await generateSemanticDescription(
        game.steamDetails
      );
      const { embedding } = await embed({
        model: models.embeddingModel,
        value: semanticDescription,
      });

      processedGames.push({
        appId: game.appId,
        name: game.steamDetails.name,
        semantic_description: semanticDescription,
        embedding,
        steam_data: game.steamDetails,
      });

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Failed to process ${game.steamDetails.name}:`, error);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(processedGames, null, 2));
  console.log(`✅ Processed ${processedGames.length} games to ${OUTPUT_FILE}`);
};

if (require.main === module) {
  main();
}
