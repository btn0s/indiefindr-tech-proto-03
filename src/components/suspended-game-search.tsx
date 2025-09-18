import { searchGames, getAllGames } from "@/lib/search";
import { NoGamesFound } from "@/components/no-games-found";
import { GameGrid } from "@/components/game-grid";

export const SuspendedGameSearch = async ({
  query,
  page = 1,
}: {
  query?: string;
  page?: number;
}) => {
  let games: any[] = [];
  let totalCount = 0;
  let hasMore = false;
  let error: string | null = null;

  try {
    if (query && query.trim()) {
      const result = await searchGames(query, undefined, page);
      games = result.games;
      totalCount = result.totalCount;
      hasMore = result.hasMore;
    } else {
      const allGames = await getAllGames();
      const startIndex = (page - 1) * 20;
      const endIndex = startIndex + 20;
      games = allGames.slice(startIndex, endIndex);
      totalCount = allGames.length;
      hasMore = endIndex < allGames.length;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "An unknown error occurred";
  }

  if (error) {
    return <div className="text-center text-red-500 mt-8">{error}</div>;
  }

  if (games.length === 0 && page === 1) {
    return <NoGamesFound query={query ?? ""} />;
  }

  return (
    <div>
      <GameGrid games={games} query={query} />
      {hasMore && (
        <div className="text-center mt-8 text-muted-foreground">
          Showing {games.length} of {totalCount} results
        </div>
      )}
    </div>
  );
};
