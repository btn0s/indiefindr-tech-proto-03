import { NextRequest, NextResponse } from "next/server";
import { searchGames, getAllGames } from "@/lib/search";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    console.log(`🔍 Search request received:`, {
      query: query || "(empty)",
      queryLength: query?.length || 0,
      userAgent: request.headers.get("user-agent")?.slice(0, 50) + "...",
      timestamp: new Date().toISOString(),
    });

    if (!query || query.length < 3) {
      console.log(
        `📋 Returning default games list (query too short: ${
          query?.length || 0
        } chars)`
      );
      const allGames = await getAllGames();
      return NextResponse.json({
        games: allGames.slice(0, 20),
        query,
        count: allGames.length,
        searchType: "default",
      });
    }

    // Check if this is a "games like X" query
    const isSimilarQuery = /(games?\s+)?(like|similar to)\s+/i.test(query);
    console.log(`🎯 Intent classification:`, {
      query,
      isSimilarQuery,
      matchedPattern: isSimilarQuery ? "games like X" : "semantic search",
      regexTest: /(games?\s+)?(like|similar to)\s+/i.test(query),
    });

    if (isSimilarQuery) {
      console.log(`🔄 Routing to similar games endpoint...`);

      // Route to similar games endpoint
      const similarResponse = await fetch(
        `${request.nextUrl.origin}/api/similar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        }
      );

      console.log(`📡 Similar games API response:`, {
        status: similarResponse.status,
        ok: similarResponse.ok,
        statusText: similarResponse.statusText,
      });

      if (similarResponse.ok) {
        const similarData = await similarResponse.json();
        console.log(`✅ Similar games search completed:`, {
          referenceGame: similarData.referenceGame?.name,
          isIndie: similarData.referenceGame?.isIndie,
          isHidden: similarData.referenceGame?.isHidden,
          similarGamesCount: similarData.count,
          wasNewReference: similarData.wasNewReference,
          processingTime: Date.now() - startTime + "ms",
        });

        return NextResponse.json({
          games: similarData.similarGames,
          query,
          count: similarData.count,
          searchType: "similar",
          referenceGame: similarData.referenceGame,
          wasNewReference: similarData.wasNewReference,
        });
      } else {
        console.log(
          `❌ Similar games API failed, falling back to semantic search`
        );
      }
    }

    // Regular semantic search
    console.log(`🧠 Performing semantic search for: "${query}"`);
    const searchResults = await searchGames(query);
    console.log(`✅ Semantic search completed:`, {
      query,
      resultsCount: searchResults.length,
      processingTime: Date.now() - startTime + "ms",
    });

    return NextResponse.json({
      games: searchResults,
      query,
      count: searchResults.length,
      searchType: "semantic",
    });
  } catch (error) {
    console.error("❌ Search API error", error);
    return NextResponse.json(
      { error: "Search failed", games: [] },
      { status: 500 }
    );
  }
}
