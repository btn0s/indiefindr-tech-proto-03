import fs from "fs";
import path from "path";
import apifyClient from "../apify";

const GATHER_ACTOR_ID = "61RPP7dywgiy0JPD0";
const GATHER_SEARCH_TERMS = [
  '"wishlist on steam"',
  //   '"You\'ll like my indie game if you enjoyed"',
  //   '"steam store"',
  //   '"my game on steam"',
  //   '"indie game developer"',
  //   '"gamedev"',
];
const GATHER_LIMIT = 10;
const PROFILE_ACTOR_ID = "V38PZzpEgOfeeWvZY";
const PROFILE_LIMIT = 10;
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

async function scrapeProfileBio(username: string): Promise<string | null> {
  try {
    console.log(`Scraping profile bio for ${username}`);

    const profileInput = {
      customMapFunction: (object: any) => {
        return { ...object };
      },
      getFollowers: false,
      getFollowing: false,
      getRetweeters: false,
      includeUnavailableUsers: false,
      maxItems: PROFILE_LIMIT,
      startUrls: [`https://twitter.com/${username}`],
    };

    const run = await apifyClient.actor(PROFILE_ACTOR_ID).call(profileInput);
    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    console.log(`Fetched ${items.length} items for profile scrape`);

    if (items.length > 0) {
      const profileData = items[0] as any;
      console.log(`Profile data keys:`, Object.keys(profileData));

      if (profileData.description) {
        console.log(`Profile bio found: "${profileData.description}"`);
        return profileData.description;
      } else {
        console.log(`No description field found in profile data`);
      }
    } else {
      console.log(`No profile data returned`);
    }

    return null;
  } catch (error) {
    console.error(`Error scraping profile for ${username}:`, error);
    return null;
  }
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
    const processedUsers = new Set<string>(); // Avoid duplicate profile scraping

    for (const item of items as unknown as TweetData[]) {
      let itemLinkCount = 0;

      // Extract Steam store links from tweet text
      if (item.text) {
        const tweetLinks = extractSteamStoreLinks(item.text);
        if (tweetLinks.length > 0) {
          console.log(
            `Found ${tweetLinks.length} Steam links in tweet text from @${item.author?.userName}`
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
              `Found ${expandedLinks.length} Steam links in expanded URLs from @${item.author?.userName}: ${urlEntity.expanded_url}`
            );
            itemLinkCount += expandedLinks.length;
          }
          allStoreLinks.push(...expandedLinks);
        }
      }

      // Track users for Phase 3 search
      if (item.author?.userName && !processedUsers.has(item.author.userName)) {
        processedUsers.add(item.author.userName);
      }

      if (itemLinkCount > 0) {
        console.log(
          `Total: ${itemLinkCount} Steam links from @${item.author?.userName}`
        );
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
    console.log(`Users found: ${processedUsers.size}`);

    // Phase 2: Search for tweets FROM these users mentioning "on steam"
    console.log(`\n=== PHASE 2: USER TWEET SEARCH ===`);
    const usernames = Array.from(processedUsers);
    console.log(
      `Searching tweets from ${usernames.length} users for "on steam" mentions...`
    );

    for (const username of usernames) {
      console.log(`\nSearching tweets from @${username}...`);

      const userSearchInput = {
        includeSearchTerms: false,
        maxItems: 20,
        onlyImage: false,
        onlyQuote: false,
        onlyTwitterBlue: false,
        onlyVerifiedUsers: false,
        onlyVideo: false,
        searchTerms: [`from:${username} "on steam"`],
        sort: "Latest",
        tweetLanguage: "en",
      };

      try {
        const userRun = await apifyClient
          .actor(GATHER_ACTOR_ID)
          .call(userSearchInput);
        console.log(`User search run completed: ${userRun.id}`);

        const { items: userItems } = await apifyClient
          .dataset(userRun.defaultDatasetId)
          .listItems();
        console.log(`Found ${userItems.length} tweets from @${username}`);

        let userLinkCount = 0;
        for (const userItem of userItems as unknown as TweetData[]) {
          // Extract Steam store links from tweet text
          if (userItem.text) {
            const tweetLinks = extractSteamStoreLinks(userItem.text);
            if (tweetLinks.length > 0) {
              console.log(
                `Found ${tweetLinks.length} Steam links in @${username}'s tweet text`
              );
              userLinkCount += tweetLinks.length;
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
                  `Found ${expandedLinks.length} Steam links in @${username}'s expanded URLs: ${urlEntity.expanded_url}`
                );
                userLinkCount += expandedLinks.length;
              }
              allStoreLinks.push(...expandedLinks);
            }
          }
        }

        if (userLinkCount > 0) {
          console.log(
            `✓ Total: ${userLinkCount} new Steam links from @${username}'s tweets`
          );
        } else {
          console.log(`No new Steam links found in @${username}'s tweets`);
        }
      } catch (error) {
        console.error(`Error searching tweets for @${username}:`, error);
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
    console.log(`Users searched: ${usernames.length}`);

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

export { extractSteamStoreLinks, scrapeProfileBio };
