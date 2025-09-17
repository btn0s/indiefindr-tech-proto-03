import { searchGames, getAllGames } from "@/lib/search";
import { NoGamesFound } from "@/components/no-games-found";
import { GameGrid } from "@/components/game-grid";

export const SuspendedGameSearch = async ({ query }: { query?: string }) => {
  let games: any[] = [];
  let error: string | null = null;

  try {
    if (query && query.trim()) {
      games = await searchGames(query);
    } else {
      games = await getAllGames();
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "An unknown error occurred";
  }

  if (error) {
    return <div className="text-center text-red-500 mt-8">{error}</div>;
  }

  if (games.length === 0) {
    return <NoGamesFound query={query ?? ""} />;
  }

  return <GameGrid games={games} query={query} />;
};
