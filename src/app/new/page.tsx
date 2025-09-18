"use client";

import { AlgoliaGameCard } from "@/components/algolia-game-card";
import { GameCard } from "@/components/game-card";
import { CustomSearchBox } from "@/components/custom-search-box";
import { CustomPagination } from "@/components/custom-pagination";
import { useHybridSearch } from "@/hooks/use-hybrid-search";
import { Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AlgoliaGame } from "@/lib/algolia";
import { GameData } from "@/lib/types";

export default function NewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get("q") || "";
  const lastQueryRef = useRef<string>("");

  const { hits, query, loading, error, nbHits, searchType, search } =
    useHybridSearch();

  // Handle search with URL updates
  const handleSearch = (searchQuery: string) => {
    const params = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      params.set("q", searchQuery);
    } else {
      params.delete("q");
    }
    router.push(`/new?${params.toString()}`);
    search(searchQuery);
  };

  // Load results based on URL query on mount and URL changes
  useEffect(() => {
    // Prevent duplicate searches
    if (lastQueryRef.current === urlQuery) return;

    lastQueryRef.current = urlQuery;
    search(urlQuery); // Empty string will load initial results
  }, [urlQuery, search]);

  return (
    <div className="py-12 flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="text-center flex flex-col">
          <h1 className="text-4xl font-bold">Indiefindr</h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto text-balance">
            Discover your next favorite indie game.
          </p>
        </div>
        <div className="mx-auto w-full max-w-lg">
          <CustomSearchBox
            onSearch={handleSearch}
            placeholder="Search indie games..."
            defaultValue={urlQuery}
          />
        </div>
        {urlQuery && !loading && (
          <p className="text-sm text-center text-muted-foreground">
            {nbHits.toLocaleString()} games found for "{urlQuery}"
            <span className="ml-2 text-xs opacity-70">
              ({searchType} search)
            </span>
          </p>
        )}
      </div>

      {error && <div className="text-center text-red-600">{error}</div>}

      {loading && (
        <div className="flex justify-center items-center gap-2 py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Searching games...</span>
        </div>
      )}

      {!loading && hits.length === 0 && urlQuery && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No games found for "{urlQuery}". Try a different search term.
          </p>
        </div>
      )}

      {!loading && hits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {hits.map((game) => {
            // Check if it's an AlgoliaGame or GameData
            const isAlgoliaGame = "objectID" in game;

            if (isAlgoliaGame) {
              return (
                <AlgoliaGameCard
                  key={(game as AlgoliaGame).objectID}
                  game={game as AlgoliaGame}
                  query={urlQuery || undefined}
                />
              );
            } else {
              return (
                <GameCard
                  key={(game as GameData).appId}
                  game={game as GameData}
                  query={urlQuery || undefined}
                />
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
