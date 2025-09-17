import fs from "fs";
import path from "path";
import { OUTPUT_FILE as GATHER_OUTPUT_FILE } from "./0-gather";
import {
  GatherData,
  SteamData,
  EnrichedTweet,
  StructuredMetadata,
} from "../types";

export const OUTPUT_FILE = "enrich-results.json";

// Extracts structured, factual data from the raw Steam API response.
const createStructuredMetadata = (steamData: SteamData): StructuredMetadata => {
  const raw = steamData.rawData;
  const playModes = new Set<string>();
  
  (raw.categories || []).forEach((cat: { description: string }) => {
    const desc = cat.description.toLowerCase();
    if (desc.includes('single-player')) playModes.add('single-player');
    if (desc.includes('multi-player')) playModes.add('multi-player');
    if (desc.includes('co-op')) playModes.add('co-op');
    if (desc.includes('online co-op')) playModes.add('online co-op');
    if (desc.includes('local co-op')) playModes.add('local co-op');
    if (desc.includes('pvp')) playModes.add('pvp');
    if (desc.includes('online pvp')) playModes.add('online pvp');
    if (desc.includes('lan pvp')) playModes.add('lan pvp');
    if (desc.includes('shared/split screen')) playModes.add('split-screen');
  });

  return {
    play_modes: Array.from(playModes),
    steam_tags: (raw.genres || []).map((g: { description: string }) => g.description),
    release_status: raw.release_date?.coming_soon ? 'Upcoming' : 'Released',
    is_free: raw.is_free,
    price: raw.price_overview?.final_formatted || (raw.is_free ? "Free" : "N/A"),
  };
};

const extractSteamUrls = (tweets: GatherData[]): string[] => {
  const steamUrls = new Set<string>();
  tweets.forEach((tweet) => {
    tweet.entities?.urls?.forEach((url: { expanded_url: string }) => {
      if (url.expanded_url.includes("store.steampowered.com/app/")) {
        steamUrls.add(url.expanded_url);
      }
    });
  });
  return Array.from(steamUrls);
};

const fetchSteamProfiles = async (
  steamUrls: string[]
): Promise<Map<string, SteamData>> => {
  const steamMap = new Map();
  const batchSize = 5;
  for (let i = 0; i < steamUrls.length; i += batchSize) {
    const batch = steamUrls.slice(i, i + batchSize);
    console.log(
      `Fetching Steam profiles batch ${
        Math.floor(i / batchSize) + 1
      }/${Math.ceil(steamUrls.length / batchSize)}`
    );
    for (const url of batch) {
      try {
        const appId = url.match(/\/app\/(\d+)/)?.[1];
        if (!appId) continue;
        const detailsRes = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${appId}`
        );
        if (!detailsRes.ok) {
          console.error(`HTTP error for ${url}: ${detailsRes.status}`);
          continue;
        }
        const detailsData = await detailsRes.json();
        const appDetails = detailsData[String(appId)]?.data;
        if (appDetails && appDetails.success !== false) {
          const steamProfile: SteamData = {
            appId,
            rawData: appDetails,
            structured_metadata: createStructuredMetadata({
              appId,
              rawData: appDetails,
            }), // Generate structured data
          };
          steamMap.set(appId, steamProfile);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching Steam profile for ${url}:`, error);
      }
    }
  }
  return steamMap;
};

const enrichTweets = async (tweets: GatherData[]): Promise<EnrichedTweet[]> => {
  console.log(`Starting enrichment for ${tweets.length} tweets`);
  const steamUrls = extractSteamUrls(tweets);
  console.log(`Found ${steamUrls.length} Steam URLs`);
  const steamProfiles = await fetchSteamProfiles(steamUrls);
  const enrichedTweets: EnrichedTweet[] = tweets.map((tweet) => {
    const enriched: EnrichedTweet = { ...tweet };
    const steamGames: SteamData[] = [];
    tweet.entities?.urls?.forEach((url) => {
      const appId = url.expanded_url.match(/\/app\/(\d+)/)?.[1];
      if (appId && steamProfiles.has(appId)) {
        steamGames.push(steamProfiles.get(appId)!);
      }
    });
    if (steamGames.length > 0) {
      enriched.steamProfiles = steamGames;
    }
    return enriched;
  });
  return enrichedTweets;
};

const main = async () => {
  try {
    const inputFile = path.join(
      __dirname,
      "../../../public/data",
      GATHER_OUTPUT_FILE
    );
    if (!fs.existsSync(inputFile)) {
      throw new Error("No tweet data found. Run 0-gather.ts first.");
    }
    const tweets: GatherData[] = JSON.parse(
      fs.readFileSync(inputFile, "utf-8")
    );
    console.log(`Loaded ${tweets.length} tweets`);
    const enrichedTweets = await enrichTweets(tweets);
    const outputFile = path.join(
      __dirname,
      "../../../public/data",
      OUTPUT_FILE
    );
    fs.writeFileSync(outputFile, JSON.stringify(enrichedTweets, null, 2));
    console.log(`Enriched data saved to: ${outputFile}`);
    console.log(`Enriched ${enrichedTweets.length} tweets`);
  } catch (error) {
    console.error("Error during enrichment:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}
