"use client";

import { useState, useEffect, useRef } from "react";
import { GameGrid } from "@/components/game-grid";
import { Loader2 } from "lucide-react";
import { GameData } from "@/lib/types";

interface GameListProps {
  initialGames: any[]; // Use any since we now handle both GameData and AlgoliaGame
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
  const [games, setGames] = useState<any[]>(initialGames);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = currentPage + 1;
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      params.set("page", String(nextPage));

      const response = await fetch(`/api/search-new?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const result = await response.json();

      setGames((prev) => {
        // Filter out duplicates by appId (handle both structures)
        const existingAppIds = new Set(
          prev.map((game) => game.appId || game.app_id)
        );
        const newGames = result.games.filter(
          (game: any) => !existingAppIds.has(game.appId || game.app_id)
        );
        return [...prev, ...newGames];
      });
      setHasMore(result.hasMore);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error("Failed to load more games:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, loading]);

  // Reset when query changes
  useEffect(() => {
    setGames(initialGames);
    setHasMore(initialHasMore);
    setCurrentPage(1);
  }, [query, initialGames, initialHasMore]);

  return (
    <div>
      <GameGrid games={games} query={query} />

      {hasMore && (
        <div ref={loadMoreRef} className="text-center mt-8 py-8">
          {loading && (
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Loading more games...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
