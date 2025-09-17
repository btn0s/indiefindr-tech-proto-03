import { searchGames } from "@/lib/search";
import { GameCard } from "./game-card";

export async function SimilarGames({
  gameName,
  currentAppId,
}: {
  gameName: string;
  currentAppId: string;
}) {
  const similarQuery = `games like ${gameName}`;
  const similarGames = await searchGames(similarQuery);

  // Filter out the current game and limit to 4 results
  const filteredSimilarGames = similarGames
    .filter((g) => g.appId !== currentAppId)
    .slice(0, 4);

  if (filteredSimilarGames.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-6">Similar Games</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredSimilarGames.map((similarGame) => (
          <GameCard key={similarGame.appId} game={similarGame} />
        ))}
      </div>
    </div>
  );
}
