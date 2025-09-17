import { createClient } from "@supabase/supabase-js";
import dEnv from "../dotenv";

dEnv();

// ========== CONFIGURATION CONSTANTS ==========

// Steam API configuration
const STEAM_API_BASE_URL = "https://store.steampowered.com/api/appdetails";
const REQUEST_DELAY_MS = 1000; // Delay between API requests to avoid rate limiting
const MAX_RETRIES = 3;

// Initialize Supabase with anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ========== INTERFACES ==========

interface SteamStoreLink {
  url: string;
  appId: string;
}

interface SteamAppDetails {
  success: boolean;
  data?: {
    type: string;
    name: string;
    steam_appid: number;
    required_age: number;
    is_free: boolean;
    detailed_description: string;
    about_the_game: string;
    short_description: string;
    supported_languages: string;
    header_image: string;
    website: string;
    pc_requirements: any;
    mac_requirements: any;
    linux_requirements: any;
    developers: string[];
    publishers: string[];
    packages: number[];
    package_groups: any[];
    platforms: {
      windows: boolean;
      mac: boolean;
      linux: boolean;
    };
    metacritic?: {
      score: number;
      url: string;
    };
    categories: Array<{
      id: number;
      description: string;
    }>;
    genres: Array<{
      id: string;
      description: string;
    }>;
    screenshots: Array<{
      id: number;
      path_thumbnail: string;
      path_full: string;
    }>;
    movies?: Array<{
      id: number;
      name: string;
      thumbnail: string;
      webm: any;
      mp4: any;
      highlight: boolean;
    }>;
    recommendations?: {
      total: number;
    };
    achievements?: {
      total: number;
      highlighted: any[];
    };
    release_date: {
      coming_soon: boolean;
      date: string;
    };
    support_info: {
      url: string;
      email: string;
    };
    background: string;
    content_descriptors: {
      ids: number[];
      notes: string;
    };
    price_overview?: {
      currency: string;
      initial: number;
      final: number;
      discount_percent: number;
      initial_formatted: string;
      final_formatted: string;
    };
  };
}

interface EnhancedSteamLink extends SteamStoreLink {
  steamDetails?: SteamAppDetails["data"];
  enhancementError?: string;
  enhancedAt: string;
}

// ========== UTILITY FUNCTIONS ==========

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSteamAppDetails(
  appId: string,
  retries = 0
): Promise<SteamAppDetails> {
  try {
    console.log(`Fetching Steam details for app ${appId}...`);

    const response = await fetch(`${STEAM_API_BASE_URL}?appids=${appId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const appDetails = data[appId] as SteamAppDetails;

    if (!appDetails.success && retries < MAX_RETRIES) {
      console.log(
        `Failed to fetch app ${appId}, retrying... (${
          retries + 1
        }/${MAX_RETRIES})`
      );
      await delay(REQUEST_DELAY_MS * 2); // Longer delay for retries
      return fetchSteamAppDetails(appId, retries + 1);
    }

    return appDetails;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(
        `Error fetching app ${appId}, retrying... (${
          retries + 1
        }/${MAX_RETRIES}):`,
        error
      );
      await delay(REQUEST_DELAY_MS * 2);
      return fetchSteamAppDetails(appId, retries + 1);
    }

    console.error(
      `Failed to fetch app ${appId} after ${MAX_RETRIES} retries:`,
      error
    );
    return { success: false };
  }
}

// ========== MAIN FUNCTION ==========

const main = async () => {
  try {
    console.log("Starting Steam link enhancement from database...");

    // Get games with status 'hunted'
    const { data: huntedGames, error: fetchError } = await supabase
      .from("games")
      .select("app_id, steam_url")
      .eq("status", "hunted");

    if (fetchError) {
      console.error("Error fetching hunted games:", fetchError);
      process.exit(1);
    }

    console.log(`Found ${huntedGames?.length || 0} games to enhance`);

    if (!huntedGames || huntedGames.length === 0) {
      console.log(
        "✅ No games found with status 'hunted' - all games already enhanced!"
      );
      return;
    }

    let processed = 0;
    let enhanced = 0;
    let failed = 0;

    for (const game of huntedGames) {
      console.log(
        `\n[${++processed}/${huntedGames.length}] Processing app ${
          game.app_id
        }...`
      );

      try {
        const steamDetails = await fetchSteamAppDetails(game.app_id);

        if (steamDetails.success && steamDetails.data) {
          // Update game with steam data and set status to 'enhanced'
          const { error: updateError } = await supabase
            .from("games")
            .update({
              steam_data: steamDetails.data,
              status: "enhanced",
            })
            .eq("app_id", game.app_id);

          if (updateError) {
            console.error(`Failed to update game ${game.app_id}:`, updateError);
            failed++;
          } else {
            enhanced++;
            console.log(
              `✓ Enhanced: ${steamDetails.data.name} (${steamDetails.data.type})`
            );
          }
        } else {
          // Mark as failed
          const { error: updateError } = await supabase
            .from("games")
            .update({
              status: "failed",
              error_message: "Steam API returned success: false",
            })
            .eq("app_id", game.app_id);

          if (updateError) {
            console.error(
              `Failed to update failed game ${game.app_id}:`,
              updateError
            );
          }
          failed++;
          console.log(
            `⚠️  Failed to enhance app ${game.app_id}: API returned success: false`
          );
        }
      } catch (error) {
        // Mark as failed with error message
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
        console.log(`❌ Error enhancing app ${game.app_id}:`, error);
      }

      // Rate limiting delay (except for last item)
      if (processed < huntedGames.length) {
        await delay(REQUEST_DELAY_MS);
      }
    }

    console.log(`\n=== ENHANCEMENT SUMMARY ===`);
    console.log(`Total games processed: ${processed}`);
    console.log(`Successfully enhanced: ${enhanced}`);
    console.log(`Enhancement errors: ${failed}`);
    console.log(
      `✅ Games are now ready for processing step (status='enhanced')`
    );
  } catch (error) {
    console.error("Error during enhancement:", error);
    process.exit(1);
  }
};

// Only run if this script is executed directly
if (require.main === module) {
  main();
}

export { fetchSteamAppDetails };
