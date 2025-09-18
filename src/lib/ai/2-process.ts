import { embed, generateText } from "ai";
import { createClient } from "@supabase/supabase-js";
import models from "./models";
import dEnv from "../dotenv";

dEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateSemanticDescription(steamData: any): Promise<string> {
  const description =
    steamData.short_description || steamData.detailed_description || "";
  const cleanDescription = description
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Extract additional context from Steam data
  const categories = (steamData.categories || [])
    .map((c: any) => c.description)
    .join(", ");
  const developers = (steamData.developers || []).join(", ");
  const tags = (steamData.genres || [])
    .map((g: any) => g.description)
    .join(", ");

  const context = `
Game: ${steamData.name}
Genres: ${tags}
Categories: ${categories}
Developer: ${developers}
Description: ${cleanDescription}
`.trim();

  try {
    const { text } = await generateText({
      model: models.chatModelMini,
      temperature: 0.5,
      system: `You are an expert in indie gaming who creates semantic descriptions for game discovery. Generate focused, keyword-rich descriptions that capture the essence of each game.

Focus on extracting:
- Core gameplay mechanics (combat, puzzle, exploration, building, crafting, etc.)
- Game genres and subgenres (roguelike, metroidvania, soulslike, etc.)
- Visual and aesthetic style (pixel art, minimalist, hand-drawn, atmospheric, etc.)
- Emotional tone and themes (cozy, challenging, dark, whimsical, narrative-driven, etc.)
- Player experience (single-player, multiplayer, co-op, competitive, casual, hardcore, etc.)
- Unique mechanics or standout features

Gaming terminology expertise:
- Recognize genre-defining terms and mechanics
- Understand indie gaming conventions and styles  
- Identify key differentiators that players search for
- Extract both explicit and implicit gameplay elements

Output format: Concise keyword phrases and descriptive terms, focusing on searchability and semantic richness. Avoid marketing fluff - focus on what players actually experience.

Keep descriptions under 25 keywords/phrases for optimal search performance.`,
      prompt: `Analyze this game data and create a semantic description for search discovery:\n\n${context}`,
    });
    return text.trim();
  } catch (error) {
    console.error(`Failed to generate description for ${steamData.name}`);
    return cleanDescription;
  }
}

const main = async () => {
  console.log("Processing enhanced games and saving to Supabase...");

  // Get games with status 'enhanced'
  const { data: enhancedGames, error: fetchError } = await supabase
    .from("games")
    .select("app_id, steam_data")
    .eq("status", "enhanced");

  if (fetchError) {
    console.error("Error fetching enhanced games:", fetchError);
    process.exit(1);
  }

  if (!enhancedGames || enhancedGames.length === 0) {
    console.log("✅ No games found with status 'enhanced' - all games already processed!");
    return;
  }

  console.log(`Processing ${enhancedGames.length} games...`);

  let processed = 0;
  let ready = 0;
  let failed = 0;

  for (const game of enhancedGames) {
    console.log(
      `[${++processed}/${enhancedGames.length}] ${game.steam_data.name}`
    );

    try {
      const semanticDescription = await generateSemanticDescription(
        game.steam_data
      );
      const { embedding } = await embed({
        model: models.embeddingModel,
        value: semanticDescription,
      });

      // Update game with embeddings and set status to 'ready'
      const { error: updateError } = await supabase
        .from("games")
        .update({
          semantic_description: semanticDescription,
          embedding,
          status: "ready",
        })
        .eq("app_id", game.app_id);

      if (updateError) {
        console.error(`Failed to update game ${game.app_id}:`, updateError);
        failed++;
      } else {
        ready++;
        console.log(`✅ Ready: ${game.steam_data.name}`);
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      // Mark as failed
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const { error: updateError } = await supabase
        .from("games")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("app_id", game.app_id);

      if (updateError) {
        console.error(
          `Failed to update failed game ${game.app_id}:`,
          updateError
        );
      }
      failed++;
      console.error(`Failed to process ${game.steam_data.name}:`, error);
    }
  }

  console.log(`\n=== PROCESSING SUMMARY ===`);
  console.log(`Total games processed: ${processed}`);
  console.log(`Successfully processed: ${ready}`);
  console.log(`Processing errors: ${failed}`);
  console.log(`✅ Games are now ready for search (status='ready')!`);
};

if (require.main === module) {
  main();
}
