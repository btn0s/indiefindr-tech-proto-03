import { searchGames, getAllGames } from "@/lib/search";
import { NoGamesFound } from "@/components/no-games-found";
import { GameListWithLoadMore } from "@/components/game-list-with-load-more";
import { getApiUrl } from "@/lib/utils";

export const SuspendedGameSearch = async ({
  query,
  page = 1,
  useNewSearch = false,
}: {
  query?: string;
  page?: number;
  useNewSearch?: boolean;
}) => {
  let games: any[] = [];
  let totalCount = 0;
  let hasMore = false;
  let error: string | null = null;

  try {
    if (query && query.trim()) {
      if (useNewSearch) {
        // Use the new search API
        const response = await fetch(
          `https://${getApiUrl()}/api/search-new?q=${encodeURIComponent(
            query
          )}&page=${page}`
        );
        if (!response.ok) throw new Error("Search failed");
        const result = await response.json();
        games = result.games;
        totalCount = result.totalCount;
        hasMore = result.hasMore;
      } else {
        // Use the original search function
        const result = await searchGames(query, undefined, page);
        games = result.games;
        totalCount = result.totalCount;
        hasMore = result.hasMore;
      }
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
    <GameListWithLoadMore
      initialGames={games}
      query={query}
      initialHasMore={hasMore}
      initialTotalCount={totalCount}
    />
  );
};
