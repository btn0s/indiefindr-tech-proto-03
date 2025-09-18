import { GameCard } from "./game-card";
import { GameData } from "@/lib/types";

export const GameGrid = ({
  games,
  query,
}: {
  games: any[];
  query?: string;
}) => {
  return (
    <div className="space-y-4">
      {query && (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">
            Search Results for "{query}"
          </h2>
          <p className="text-gray-600">
            Found {games.length} games matching your search
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {games.map((game) => (
          <GameCard
            key={game.appId || game.app_id || game.objectID || Math.random()}
            game={game}
            query={query}
          />
        ))}
      </div>
    </div>
  );
};
