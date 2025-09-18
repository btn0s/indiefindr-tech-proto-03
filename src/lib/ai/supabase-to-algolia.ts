import { createClient } from "@supabase/supabase-js";
import { algoliasearch } from "algoliasearch";
import dEnv from "../dotenv";

dEnv();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Algolia configuration
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || "indiefindr_new";

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  console.error("Missing Algolia environment variables");
  process.exit(1);
}

// Initialize Algolia client
const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

const main = async () => {
  try {
    console.log("Starting Supabase to Algolia data dump...");

    // Get all games with steam_data (status 'ready' or 'enhanced')
    const { data: games, error: fetchError } = await supabase
      .from("games")
      .select("*")
      .not("steam_data", "is", null)
      .in("status", ["ready", "enhanced"]);

    if (fetchError) {
      console.error("Error fetching games:", fetchError);
      process.exit(1);
    }

    console.log(`Found ${games?.length || 0} games to upload`);

    if (!games || games.length === 0) {
      console.log("No games found with steam_data");
      return;
    }

    // Convert to Algolia records - flatten essential fields only
    const algoliaRecords = games.map((game) => {
      const steamData = game.steam_data;

      return {
        objectID: game.app_id,
        app_id: game.app_id,
        steam_url: game.steam_url,
        status: game.status,
        semantic_description: game.semantic_description,
        // Essential Steam data fields for search
        name: steamData?.name,
        description: steamData?.short_description,
        detailed_description: steamData?.detailed_description?.substring(
          0,
          500
        ), // Truncate long descriptions
        header_image: steamData?.header_image,
        price:
          steamData?.price_overview?.final_formatted ||
          (steamData?.is_free ? "Free" : ""),
        developers: steamData?.developers,
        publishers: steamData?.publishers,
        release_date: steamData?.release_date?.date,
        coming_soon: steamData?.release_date?.coming_soon,
        tags: steamData?.genres?.map((g: any) => g.description) || [],
        categories: steamData?.categories?.map((c: any) => c.description) || [],
        platforms: steamData?.platforms,
        metacritic_score: steamData?.metacritic?.score,
        type: steamData?.type,
        required_age: steamData?.required_age,
        recommendations: steamData?.recommendations?.total,
        // Keep only first few screenshots to save space
        screenshots:
          steamData?.screenshots?.slice(0, 3)?.map((s: any) => s.path_full) ||
          [],
      };
    });

    // Upload to Algolia using v5 API
    console.log(`Uploading ${algoliaRecords.length} games to Algolia...`);

    for (let i = 0; i < algoliaRecords.length; i++) {
      const record = algoliaRecords[i];

      const { taskID } = await algoliaClient.saveObject({
        indexName: ALGOLIA_INDEX_NAME,
        body: record,
      });

      // Wait for indexing to complete
      await algoliaClient.waitForTask({
        indexName: ALGOLIA_INDEX_NAME,
        taskID,
      });

      console.log(
        `Uploaded ${i + 1}/${algoliaRecords.length}: ${record.objectID}`
      );
    }

    console.log(
      `✅ Successfully uploaded ${algoliaRecords.length} games to Algolia index '${ALGOLIA_INDEX_NAME}'`
    );
  } catch (error) {
    console.error("Error during data dump:", error);
    process.exit(1);
  }
};

// Only run if this script is executed directly
if (require.main === module) {
  main();
}

export { main as supabaseToAlgolia };
