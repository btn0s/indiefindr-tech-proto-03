import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;

    if (!appId || isNaN(Number(appId))) {
      return NextResponse.json(
        { success: false, error: "Invalid App ID" },
        { status: 400 }
      );
    }

    // Fetch game data from Steam Store API
    const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    const response = await fetch(steamUrl);

    if (!response.ok) {
      throw new Error(`Steam API error: ${response.status}`);
    }

    const data = await response.json();
    const gameData = data[appId];

    if (!gameData || !gameData.success) {
      return NextResponse.json(
        { success: false, error: "Game not found or not available" },
        { status: 404 }
      );
    }

    console.log(`Fetched Steam game data for ${appId}`, gameData);

    return NextResponse.json({
      success: true,
      data: gameData,
    });
  } catch (error) {
    console.error("Error fetching Steam game data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
