import fs from "fs";
import path from "path";
import apifyClient from "../apify";

// ========== CONFIGURATION CONSTANTS ==========

// Actor IDs
const GATHER_ACTOR_ID = "61RPP7dywgiy0JPD0";

// Phase 1: Primary search configuration
const GATHER_SEARCH_TERMS = [
  '"wishlist on steam"',
  //   '"You\'ll like my indie game if you enjoyed"',
  //   '"steam store"',
  //   '"my game on steam"',
  //   '"indie game developer"',
  //   '"gamedev"',
];
const GATHER_LIMIT = 10;

// Phase 2: Backup search configuration
const BACKUP_SEARCH_TEMPLATES = [
  "store.steampowered", // Direct Steam store mentions
  "steam", // General Steam mentions
  '"on steam"', // "on steam" phrase
  "wishlist", // Wishlist mentions
];
const BACKUP_TWEETS_PER_USER = 20; // Max tweets per user across all search terms

// Output configuration
export const OUTPUT_FILE = "hunt-results.json";

const input = {
  includeSearchTerms: false,
  maxItems: GATHER_LIMIT,
  onlyImage: false,
  onlyQuote: false,
  onlyTwitterBlue: false,
  onlyVerifiedUsers: false,
  onlyVideo: false,
  searchTerms: GATHER_SEARCH_TERMS,
  sort: "Latest",
  tweetLanguage: "en",
};

// Steam store URL pattern
const STEAM_STORE_PATTERN = /https?:\/\/store\.steampowered\.com\/app\/(\d+)/gi;

interface SteamStoreLink {
  url: string;
  appId: string;
}

interface TweetData {
  id: string;
  text?: string;
  author?: {
    userName?: string;
    description?: string;
    url?: string;
  };
  url?: string;
  entities?: {
    urls?: Array<{
      expanded_url: string;
    }>;
  };
}

function extractSteamStoreLinks(text: string): SteamStoreLink[] {
  const links: SteamStoreLink[] = [];
  const matches = text.matchAll(STEAM_STORE_PATTERN);

  for (const match of matches) {
    const url = match[0];
    const appId = match[1];

    links.push({
      url: url.toLowerCase(),
      appId,
    });
  }

  return links;
}

const main = async () => {
  try {
    console.log("Starting Steam link hunt with terms:", GATHER_SEARCH_TERMS);

    // Run the Actor and wait for it to finish
    const run = await apifyClient.actor(GATHER_ACTOR_ID).call(input);
    console.log("Actor run completed:", run.id);

    // Fetch results from the run's dataset
    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();
    console.log(`Fetched ${items.length} items`);

    const allStoreLinks: SteamStoreLink[] = [];
    const usersWithSteamLinks = new Set<string>(); // Users who already have Steam links
    const usersWithoutSteamLinks = new Set<string>(); // Users who need backup search

    for (const item of items as unknown as TweetData[]) {
      let itemLinkCount = 0;
      const username = item.author?.userName;

      // Extract Steam store links from tweet text
      if (item.text) {
        const tweetLinks = extractSteamStoreLinks(item.text);
        if (tweetLinks.length > 0) {
          console.log(
            `Found ${tweetLinks.length} Steam links in tweet text from @${username}`
          );
          itemLinkCount += tweetLinks.length;
        }
        allStoreLinks.push(...tweetLinks);
      }

      // Extract Steam store links from expanded URLs in entities
      if (item.entities?.urls) {
        for (const urlEntity of item.entities.urls) {
          const expandedLinks = extractSteamStoreLinks(urlEntity.expanded_url);
          if (expandedLinks.length > 0) {
            console.log(
              `Found ${expandedLinks.length} Steam links in expanded URLs from @${username}: ${urlEntity.expanded_url}`
            );
            itemLinkCount += expandedLinks.length;
          }
          allStoreLinks.push(...expandedLinks);
        }
      }

      // Categorize users based on whether they have Steam links
      if (username) {
        if (itemLinkCount > 0) {
          usersWithSteamLinks.add(username);
          console.log(
            `✓ @${username}: ${itemLinkCount} Steam links found in tweet`
          );
        } else if (!usersWithSteamLinks.has(username)) {
          usersWithoutSteamLinks.add(username);
          console.log(
            `⚠️  @${username}: No Steam links found, will search their history`
          );
        }
      }
    }

    // Remove duplicates by URL
    const uniqueLinks = new Map<string, SteamStoreLink>();
    allStoreLinks.forEach((link) => {
      uniqueLinks.set(link.url, link);
    });

    const finalStoreLinks = Array.from(uniqueLinks.values());
    console.log(`\n=== PHASE 1 SUMMARY ===`);
    console.log(`Total Steam links found: ${allStoreLinks.length}`);
    console.log(`Unique Steam store links: ${finalStoreLinks.length}`);
    console.log(`Users with Steam links: ${usersWithSteamLinks.size}`);
    console.log(`Users without Steam links: ${usersWithoutSteamLinks.size}`);

    // Phase 2: Only search users who DON'T have Steam links (backup search)
    if (usersWithoutSteamLinks.size === 0) {
      console.log(`\n=== PHASE 2: SKIPPED ===`);
      console.log(
        `All users already have Steam links found! No backup search needed.`
      );
    } else {
      console.log(
        `\n=== PHASE 2: BACKUP SEARCH FOR USERS WITHOUT STEAM LINKS ===`
      );
      const usernames = Array.from(usersWithoutSteamLinks);
      console.log(
        `Searching for Steam store URLs from ${usernames.length} users...`
      );

      // Create multiple search strategies for each user to maximize discovery
      const searchTerms = usernames.flatMap((username) =>
        BACKUP_SEARCH_TEMPLATES.map(
          (template) => `from:${username} ${template}`
        )
      );

      console.log(`Search terms (${searchTerms.length}):`, searchTerms);

      const userSearchInput = {
        includeSearchTerms: false,
        maxItems: usernames.length * BACKUP_TWEETS_PER_USER, // Scale tweets per user across all search terms
        onlyImage: false,
        onlyQuote: false,
        onlyTwitterBlue: false,
        onlyVerifiedUsers: false,
        onlyVideo: false,
        searchTerms: searchTerms,
        sort: "Latest",
        tweetLanguage: "en",
      };

      try {
        const userRun = await apifyClient
          .actor(GATHER_ACTOR_ID)
          .call(userSearchInput);
        console.log(`Combined user search run completed: ${userRun.id}`);

        const { items: userItems } = await apifyClient
          .dataset(userRun.defaultDatasetId)
          .listItems();
        console.log(`Found ${userItems.length} tweets with Steam store URLs`);

        let phase2LinkCount = 0;
        const userLinkCounts = new Map<string, number>();

        for (const userItem of userItems as unknown as TweetData[]) {
          const author = userItem.author?.userName;
          let itemLinkCount = 0;

          // Extract Steam store links from tweet text
          if (userItem.text) {
            const tweetLinks = extractSteamStoreLinks(userItem.text);
            if (tweetLinks.length > 0) {
              console.log(
                `Found ${tweetLinks.length} Steam links in @${author}'s tweet text`
              );
              itemLinkCount += tweetLinks.length;
            }
            allStoreLinks.push(...tweetLinks);
          }

          // Extract Steam store links from expanded URLs in entities
          if (userItem.entities?.urls) {
            for (const urlEntity of userItem.entities.urls) {
              const expandedLinks = extractSteamStoreLinks(
                urlEntity.expanded_url
              );
              if (expandedLinks.length > 0) {
                console.log(
                  `Found ${expandedLinks.length} Steam links in @${author}'s expanded URLs: ${urlEntity.expanded_url}`
                );
                itemLinkCount += expandedLinks.length;
              }
              allStoreLinks.push(...expandedLinks);
            }
          }

          if (itemLinkCount > 0 && author) {
            phase2LinkCount += itemLinkCount;
            userLinkCounts.set(
              author,
              (userLinkCounts.get(author) || 0) + itemLinkCount
            );
          }
        }

        console.log(`\n=== PHASE 2 USER BREAKDOWN ===`);
        userLinkCounts.forEach((count, username) => {
          console.log(`@${username}: ${count} Steam links found`);
        });
        console.log(
          `✓ Total Phase 2: ${phase2LinkCount} new Steam links found`
        );
      } catch (error) {
        console.error(`Error in combined user search:`, error);
      }
    }

    // Final deduplication after Phase 2
    const finalUniqueLinks = new Map<string, SteamStoreLink>();
    allStoreLinks.forEach((link) => {
      finalUniqueLinks.set(link.url, link);
    });

    const allFinalLinks = Array.from(finalUniqueLinks.values());
    console.log(`\n=== FINAL SUMMARY ===`);
    console.log(
      `Total Steam links found (both phases): ${allStoreLinks.length}`
    );
    console.log(`Unique Steam store links (final): ${allFinalLinks.length}`);
    console.log(`Users searched: ${usersWithoutSteamLinks.size}`);

    // Ensure output directory exists
    const outputDir = path.join(__dirname, "../../../public/data");
    const outputFile = path.join(outputDir, OUTPUT_FILE);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write Steam store links to file
    fs.writeFileSync(outputFile, JSON.stringify(allFinalLinks, null, 2));
    console.log(`Steam store links saved to: ${outputFile}`);
  } catch (error) {
    console.error("Error during Steam link hunt:", error);
    process.exit(1);
  }
};

// Only run if this script is executed directly
if (require.main === module) {
  main();
}

export { extractSteamStoreLinks };
