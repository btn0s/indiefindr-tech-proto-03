import { getApiUrl } from "@/lib/utils";
import { GameCard } from "./game-card";

export async function SimilarGames({
  gameName,
  currentAppId,
}: {
  gameName: string;
  currentAppId: string;
}) {
  const similarQuery = `games like ${gameName}`;

  try {
    // Use the new search API
    const response = await fetch(
      `https://${getApiUrl()}/api/search-new?q=${encodeURIComponent(
        similarQuery
      )}&pageSize=8`
    );

    if (!response.ok) {
      return null;
    }

    const { games } = await response.json();

    // Filter out the current game and limit to 4 results
    const filteredSimilarGames = games
      .filter((g: any) => (g.appId || g.app_id) !== currentAppId)
      .slice(0, 4);

    if (filteredSimilarGames.length === 0) {
      return null;
    }

    return (
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">Similar Games</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredSimilarGames.map((similarGame: any) => (
            <GameCard
              key={similarGame.appId || similarGame.app_id}
              game={similarGame}
            />
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Failed to load similar games:", error);
    return null;
  }
}
