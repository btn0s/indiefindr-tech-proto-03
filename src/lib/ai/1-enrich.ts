import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
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

const scrapeSteamProfiles = async (
  steamUrls: string[]
): Promise<Map<string, SteamProfile>> => {
  const steamMap = new Map();

  // Process in batches
  const batchSize = 5;
  for (let i = 0; i < steamUrls.length; i += batchSize) {
    const batch = steamUrls.slice(i, i + batchSize);

    console.log(
      `Scraping Steam profiles batch ${
        Math.floor(i / batchSize) + 1
      }/${Math.ceil(steamUrls.length / batchSize)}`
    );

    for (const url of batch) {
      try {
        const appId = url.match(/\/app\/(\d+)/)?.[1];
        if (!appId) continue;

        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            Connection: "keep-alive",
          },
        });

        if (!response.ok) {
          console.error(`HTTP error for ${url}: ${response.status}`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const steamProfile: SteamProfile = {
          appId,
          title: $(".apphub_AppName").text().trim() || "",
          description: $(".game_description_snippet").text().trim() || "",
          price:
            $(".discount_final_price").text().trim() ||
            $(".game_purchase_price").text().trim() ||
            "Free",
          tags: $(".app_tag")
            .map((_, el) => $(el).text().trim())
            .get()
            .slice(0, 10),
          releaseDate: $(".date").text().trim() || "",
          developer: $(".dev_row .summary").eq(0).text().trim() || "",
          publisher: $(".dev_row .summary").eq(1).text().trim() || "",
          images: [
            $(".game_header_image_full").attr("src") || "",
            ...$(".highlight_strip_item img")
              .map((_, el) => $(el).attr("src"))
              .get()
              .slice(0, 4),
          ].filter(Boolean),
        };

        if (steamProfile.title) {
          steamMap.set(appId, steamProfile);
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error scraping Steam profile for ${url}:`, error);
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

  // Scrape Steam profiles
  const steamProfiles = await scrapeSteamProfiles(steamUrls);

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

main();
