import fs from "fs";
import path from "path";
import { OUTPUT_FILE as GATHER_OUTPUT_FILE } from "./0-gather";

export const OUTPUT_FILE = "enrich-results.json";

interface TwitterTweet {
  id: string;
  author: {
    userName: string;
    url: string;
  };
  entities?: {
    urls?: Array<{
      expanded_url: string;
    }>;
  };
}

interface SteamProfile {
  appId: string;
  title: string;
  description: string;
  price: string;
  tags: string[];
  releaseDate: string;
  developer: string;
  publisher: string;
  images: string[];
}

interface EnrichedTweet extends TwitterTweet {
  steamProfiles?: SteamProfile[];
}

const extractSteamUrls = (tweets: TwitterTweet[]): string[] => {
  const steamUrls = new Set<string>();

  tweets.forEach((tweet) => {
    tweet.entities?.urls?.forEach((url) => {
      if (url.expanded_url.includes("store.steampowered.com/app/")) {
        steamUrls.add(url.expanded_url);
      }
    });
  });

  return Array.from(steamUrls);
};

const fetchSteamProfiles = async (
  steamUrls: string[]
): Promise<Map<string, SteamProfile>> => {
  const steamMap = new Map();

  // Process in batches
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

        // Use Steam API instead of web scraping
        const detailsRes = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${appId}`
        );

        if (!detailsRes.ok) {
          console.error(`HTTP error for ${url}: ${detailsRes.status}`);
          continue;
        }

        const detailsData = await detailsRes.json();
        const appDetails = detailsData[String(appId)]?.data;

        if (appDetails) {
          const steamProfile: SteamProfile = {
            appId,
            title: appDetails.name || "",
            description: appDetails.short_description || "",
            price: appDetails.price_overview?.final_formatted || "Free",
            tags:
              appDetails.genres?.map((genre: any) => genre.description) || [],
            releaseDate: appDetails.release_date?.date || "",
            developer: appDetails.developers?.join(", ") || "",
            publisher: appDetails.publishers?.join(", ") || "",
            images: [
              appDetails.header_image || "",
              ...(appDetails.screenshots
                ?.slice(0, 4)
                .map((s: any) => s.path_full) || []),
            ].filter(Boolean),
          };

          steamMap.set(appId, steamProfile);
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching Steam profile for ${url}:`, error);
      }
    }
  }

  return steamMap;
};

const enrichTweets = async (
  tweets: TwitterTweet[]
): Promise<EnrichedTweet[]> => {
  console.log(`Starting enrichment for ${tweets.length} tweets`);

  // Extract Steam URLs
  const steamUrls = extractSteamUrls(tweets);

  console.log(`Found ${steamUrls.length} Steam URLs`);

  // Fetch Steam profiles via API
  const steamProfiles = await fetchSteamProfiles(steamUrls);

  // Enrich tweets with Steam data
  const enrichedTweets: EnrichedTweet[] = tweets.map((tweet) => {
    const enriched: EnrichedTweet = { ...tweet };

    // Add Steam profile data
    const steamGames: SteamProfile[] = [];
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
    // Load existing tweet data
    const inputFile = path.join(
      __dirname,
      "../../../public/data",
      GATHER_OUTPUT_FILE
    );

    if (!fs.existsSync(inputFile)) {
      throw new Error("No tweet data found. Run 0-gather.ts first.");
    }

    const tweets: TwitterTweet[] = JSON.parse(
      fs.readFileSync(inputFile, "utf-8")
    );
    console.log(`Loaded ${tweets.length} tweets`);

    // Enrich tweets with additional data
    const enrichedTweets = await enrichTweets(tweets);

    // Save enriched data
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

// Only run if this script is executed directly
if (require.main === module) {
  main();
}
