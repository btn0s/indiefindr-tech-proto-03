import fs from "fs";
import path from "path";

// Script to compare raw Steam data vs our processed data
const compareSteamData = async () => {
  console.log("Comparing Raw vs Processed Steam Data\n");

  // Test with one app ID
  const appId = "620"; // Portal 2
  
  try {
    console.log(`Fetching raw data for App ID: ${appId}`);
    
    // Fetch raw data
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`
    );

    if (!response.ok) {
      console.log(`❌ HTTP error: ${response.status}`);
      return;
    }

    const data = await response.json();
    const rawData = data[appId];

    if (!rawData || !rawData.success) {
      console.log(`❌ No data or unsuccessful`);
      return;
    }

    // Save raw data
    const outputDir = path.join(__dirname, "../../../public/data");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const rawFile = path.join(outputDir, `steam-raw-comparison.json`);
    fs.writeFileSync(rawFile, JSON.stringify(rawData, null, 2));

    // Show what we currently extract vs what's available
    const appDetails = rawData.data;
    
    console.log("📊 CURRENT EXTRACTION:");
    console.log(`- Title: ${appDetails.name || "N/A"}`);
    console.log(`- Description: ${appDetails.short_description || "N/A"}`);
    console.log(`- Price: ${appDetails.price_overview?.final_formatted || "N/A"}`);
    console.log(`- Genres: ${appDetails.genres?.map((g: any) => g.description).join(", ") || "N/A"}`);
    console.log(`- Categories: ${appDetails.categories?.map((c: any) => c.description).join(", ") || "N/A"}`);
    console.log(`- Platforms: ${Object.keys(appDetails.platforms || {}).join(", ") || "N/A"}`);
    console.log(`- Screenshots: ${appDetails.screenshots?.length || 0} available`);
    console.log(`- Movies: ${appDetails.movies?.length || 0} available`);
    console.log(`- Metacritic: ${appDetails.metacritic?.score || "N/A"}`);

    console.log("\n🔍 AVAILABLE RAW FIELDS:");
    console.log("All top-level keys:", Object.keys(appDetails).sort());

    console.log("\n📋 DETAILED FIELD BREAKDOWN:");
    
    // Show some interesting fields we might be missing
    const interestingFields = [
      'detailed_description',
      'supported_languages',
      'recommendations',
      'achievements',
      'release_date',
      'pc_requirements',
      'mac_requirements',
      'linux_requirements',
      'developers',
      'publishers',
      'price_overview',
      'packages',
      'package_groups',
      'metacritic',
      'reviews',
      'support_info',
      'background',
      'background_raw',
      'content_descriptors',
      'legal_notice',
      'drm_notice',
      'ext_user_account_notice',
      'dlc',
      'demos',
      'depots',
      'commercial',
      'screenshots',
      'movies',
      'categories',
      'genres',
      'platforms',
      'type',
      'controller_support',
      'is_free',
      'free_verdict',
      'initial_price',
      'currency',
      'fullgame',
      'packages',
      'package_groups'
    ];

    interestingFields.forEach(field => {
      if (appDetails[field] !== undefined) {
        console.log(`✅ ${field}:`, typeof appDetails[field], Array.isArray(appDetails[field]) ? `(array, ${appDetails[field].length} items)` : '');
      }
    });

    console.log(`\n💾 Full raw data saved to: steam-raw-comparison.json`);
    console.log("📏 Raw data size:", JSON.stringify(rawData).length, "characters");

  } catch (error) {
    console.error("❌ Error:", error);
  }
};

// Run the comparison
if (require.main === module) {
  compareSteamData().catch(console.error);
}

export { compareSteamData };
