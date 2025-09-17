import { NextRequest, NextResponse } from "next/server";
import { searchGames, getAllGames } from "@/lib/search";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 3) {
      const allGames = await getAllGames();
      return NextResponse.json({ games: allGames.slice(0, 20) });
    }

    const searchResults = await searchGames(query);
    return NextResponse.json({
      games: searchResults,
      query,
      count: searchResults.length,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Search failed", games: [] },
      { status: 500 }
    );
  }
}
