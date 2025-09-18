"use client";

import { useState } from "react";
import { GameGrid } from "@/components/game-grid";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { GameData } from "@/lib/types";

interface GameListProps {
  initialGames: GameData[];
  query?: string;
  initialHasMore: boolean;
  initialTotalCount: number;
}

export function GameListWithLoadMore({
  initialGames,
  query,
  initialHasMore,
  initialTotalCount,
}: GameListProps) {
  const [games, setGames] = useState<GameData[]>(initialGames);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = currentPage + 1;
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      params.set("page", String(nextPage));

      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const result = await response.json();

      setGames((prev) => [...prev, ...result.games]);
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error("Failed to load more games:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <GameGrid games={games} query={query} />

      {totalCount > 0 && (
        <div className="text-center mt-4 text-sm text-muted-foreground">
          Showing {games.length} of {totalCount} results
        </div>
      )}

      {hasMore && (
        <div className="text-center mt-8">
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="outline"
            className="px-8"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading more...
              </>
            ) : (
              "Load More Games"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
