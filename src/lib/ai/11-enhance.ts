import fs from "fs";
import path from "path";
import dEnv from "../dotenv";

dEnv();

// ========== CONFIGURATION CONSTANTS ==========

// Steam API configuration
const STEAM_API_BASE_URL = "https://store.steampowered.com/api/appdetails";
const REQUEST_DELAY_MS = 1000; // Delay between API requests to avoid rate limiting
const MAX_RETRIES = 3;

// File paths
const INPUT_FILE = "hunt-results.json";
const OUTPUT_FILE = "enhanced-results.json";

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
    console.log("Starting Steam link enhancement...");

    // Read hunt results
    const inputPath = path.join(__dirname, "../../../public/data", INPUT_FILE);
    const outputPath = path.join(
      __dirname,
      "../../../public/data",
      OUTPUT_FILE
    );

    if (!fs.existsSync(inputPath)) {
      console.error(`Input file not found: ${inputPath}`);
      process.exit(1);
    }

    const huntResults: SteamStoreLink[] = JSON.parse(
      fs.readFileSync(inputPath, "utf8")
    );
    console.log(`Loaded ${huntResults.length} Steam links from hunt results`);

    // Get unique app IDs
    const uniqueAppIds = [...new Set(huntResults.map((link) => link.appId))];
    console.log(`Found ${uniqueAppIds.length} unique Steam app IDs`);

    // Enhance each link with Steam API data
    const enhancedResults: EnhancedSteamLink[] = [];
    let processed = 0;

    for (const link of huntResults) {
      console.log(
        `\n[${++processed}/${huntResults.length}] Processing app ${
          link.appId
        }...`
      );

      const enhancedLink: EnhancedSteamLink = {
        ...link,
        enhancedAt: new Date().toISOString(),
      };

      try {
        const steamDetails = await fetchSteamAppDetails(link.appId);

        if (steamDetails.success && steamDetails.data) {
          enhancedLink.steamDetails = steamDetails.data;
          console.log(
            `✓ Enhanced: ${steamDetails.data.name} (${steamDetails.data.type})`
          );
        } else {
          enhancedLink.enhancementError = "Steam API returned success: false";
          console.log(
            `⚠️  Failed to enhance app ${link.appId}: API returned success: false`
          );
        }
      } catch (error) {
        enhancedLink.enhancementError =
          error instanceof Error ? error.message : "Unknown error";
        console.log(`❌ Error enhancing app ${link.appId}:`, error);
      }

      enhancedResults.push(enhancedLink);

      // Rate limiting delay (except for last item)
      if (processed < huntResults.length) {
        await delay(REQUEST_DELAY_MS);
      }
    }

    // Write enhanced results
    fs.writeFileSync(outputPath, JSON.stringify(enhancedResults, null, 2));

    // Summary
    const successCount = enhancedResults.filter(
      (link) => link.steamDetails
    ).length;
    const errorCount = enhancedResults.filter(
      (link) => link.enhancementError
    ).length;

    console.log(`\n=== ENHANCEMENT SUMMARY ===`);
    console.log(`Total links processed: ${enhancedResults.length}`);
    console.log(`Successfully enhanced: ${successCount}`);
    console.log(`Enhancement errors: ${errorCount}`);
    console.log(`Enhanced results saved to: ${outputPath}`);

    // Show enhanced games
    if (successCount > 0) {
      console.log(`\n=== ENHANCED GAMES ===`);
      enhancedResults
        .filter((link) => link.steamDetails)
        .forEach((link, index) => {
          const game = link.steamDetails!;
          console.log(
            `${index + 1}. ${game.name} (${game.type}) - ${
              game.developers?.join(", ") || "Unknown developer"
            }`
          );
        });
    }
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
