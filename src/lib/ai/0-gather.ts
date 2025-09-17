import fs from "fs";
import path from "path";
import apifyClient from "../apify";

const ACTOR_ID = "61RPP7dywgiy0JPD0";
const SEARCH_TERMS = ['"wishlist on steam"'];
const LIMIT = 20;
export const OUTPUT_FILE = "gather-results.json";

const input = {
  includeSearchTerms: false,
  maxItems: LIMIT,
  onlyImage: false,
  onlyQuote: false,
  onlyTwitterBlue: false,
  onlyVerifiedUsers: false,
  onlyVideo: false,
  searchTerms: SEARCH_TERMS,
  sort: "Latest",
  tweetLanguage: "en",
};

const main = async () => {
  try {
    console.log("Starting gather with terms:", SEARCH_TERMS);

    // Run the Actor and wait for it to finish
    const run = await apifyClient.actor(ACTOR_ID).call(input);
    console.log("Actor run completed:", run.id);

    // Fetch results from the run's dataset
    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();
    console.log(`Fetched ${items.length} items`);

    // Ensure output directory exists
    const outputDir = path.join(__dirname, "../../../public/data");
    const outputFile = path.join(outputDir, OUTPUT_FILE);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write results directly to file
    fs.writeFileSync(outputFile, JSON.stringify(items, null, 2));
    console.log(`Results saved to: ${outputFile}`);
  } catch (error) {
    console.error("Error during gather:", error);
    process.exit(1);
  }
};

// Only run if this script is executed directly
if (require.main === module) {
  main();
}
