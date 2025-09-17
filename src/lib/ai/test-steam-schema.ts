import fs from "fs";
import path from "path";

// Test script to fetch raw Steam data and save it to see the schema
const testSteamSchema = async () => {
  // Test with a few different Steam app IDs to see variety in data
  const testAppIds = [
    "2568390", // Survivor Strain (from the error)
    "2782620", // Rekesh Gaal (from the error) 
    "3357160", // HOLLOW MIRE (from the error)
    "620", // Portal 2 (popular game for comparison)
    "271590", // Grand Theft Auto V (another popular game)
  ];

  console.log("Fetching raw Steam data for schema analysis...\n");

  for (const appId of testAppIds) {
    try {
      console.log(`Fetching data for App ID: ${appId}`);
      
      const response = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appId}`
      );

      if (!response.ok) {
        console.log(`❌ HTTP error for ${appId}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const appDetails = data[appId];

      if (!appDetails || !appDetails.success) {
        console.log(`❌ No data or unsuccessful for ${appId}`);
        continue;
      }

      console.log(`✅ Successfully fetched data for ${appId}`);
      console.log(`Game: ${appDetails.data.name}`);
      console.log(`Keys in data:`, Object.keys(appDetails.data).sort());
      console.log("---");

      // Save raw data for inspection
      const outputDir = path.join(__dirname, "../../../public/data");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputFile = path.join(outputDir, `steam-raw-${appId}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(appDetails, null, 2));
      console.log(`💾 Saved raw data to: steam-raw-${appId}.json\n`);

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Error fetching ${appId}:`, error);
    }
  }

  console.log("Schema analysis complete! Check the generated JSON files to see the raw Steam API structure.");
};

// Run the test
if (require.main === module) {
  testSteamSchema().catch(console.error);
}

export { testSteamSchema };
