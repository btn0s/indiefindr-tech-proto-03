import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import apifyClient from "@/lib/apify";
import dEnv from "@/lib/dotenv";

dEnv();

// Actor ID for Twitter scraping
const GATHER_ACTOR_ID = "61RPP7dywgiy0JPD0";

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");
    const searchTerm = searchParams.get("search") || '"wishlist on steam"';

    console.log(
      `Starting debug hunt with term: ${searchTerm}, limit: ${limit}`
    );

    const input = {
      includeSearchTerms: false,
      maxItems: limit,
      onlyImage: false,
      onlyQuote: false,
      onlyTwitterBlue: false,
      onlyVerifiedUsers: false,
      onlyVideo: false,
      searchTerms: [searchTerm],
      sort: "Latest",
      tweetLanguage: "en",
    };

    // Run the Actor and wait for it to finish
    const run = await apifyClient.actor(GATHER_ACTOR_ID).call(input);
    console.log("Actor run completed:", run.id);

    // Fetch results from the run's dataset
    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    console.log(`Fetched ${items.length} items`);

    const allStoreLinks: SteamStoreLink[] = [];
    const processedTweets: Array<{
      id: string;
      text: string;
      author: string;
      steamLinks: SteamStoreLink[];
      url: string;
    }> = [];

    for (const item of items as unknown as TweetData[]) {
      const username = item.author?.userName || "unknown";
      const tweetText = item.text || "";
      const tweetUrl = item.url || "";

      // Extract Steam store links from tweet text
      const tweetLinks = extractSteamStoreLinks(tweetText);

      // Extract Steam store links from expanded URLs in entities
      let entityLinks: SteamStoreLink[] = [];
      if (item.entities?.urls) {
        for (const urlEntity of item.entities.urls) {
          const expandedLinks = extractSteamStoreLinks(urlEntity.expanded_url);
          entityLinks.push(...expandedLinks);
        }
      }

      const allTweetLinks = [...tweetLinks, ...entityLinks];
      allStoreLinks.push(...allTweetLinks);

      processedTweets.push({
        id: item.id,
        text: tweetText,
        author: username,
        steamLinks: allTweetLinks,
        url: tweetUrl,
      });
    }

    // Remove duplicates by URL
    const uniqueLinks = new Map<string, SteamStoreLink>();
    allStoreLinks.forEach((link) => {
      uniqueLinks.set(link.url, link);
    });

    const finalStoreLinks = Array.from(uniqueLinks.values());

    return NextResponse.json({
      success: true,
      data: {
        tweets: processedTweets,
        steamLinks: finalStoreLinks,
        summary: {
          totalTweets: processedTweets.length,
          totalSteamLinks: allStoreLinks.length,
          uniqueSteamLinks: finalStoreLinks.length,
          searchTerm,
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Error in debug hunt:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
