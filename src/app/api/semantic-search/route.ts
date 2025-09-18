import { NextRequest, NextResponse } from "next/server";
import { searchGames } from "@/lib/search";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    if (!query.trim()) {
      return NextResponse.json({ 
        games: [], 
        totalCount: 0, 
        hasMore: false 
      });
    }

    const result = await searchGames(query, undefined, page, pageSize);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Semantic search API error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
