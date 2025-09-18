import { NextRequest, NextResponse } from "next/server";
import { searchGames, getAllGames } from "@/lib/search";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  try {
    if (query.trim()) {
      const result = await searchGames(query, undefined, page, pageSize);
      return NextResponse.json(result);
    } else {
      const allGames = await getAllGames();
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedGames = allGames.slice(startIndex, endIndex);

      return NextResponse.json({
        games: paginatedGames,
        totalCount: allGames.length,
        hasMore: endIndex < allGames.length,
      });
    }
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to search games" },
      { status: 500 }
    );
  }
}