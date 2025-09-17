import { Suspense } from "react";
import { SearchBox } from "@/components/search-box";
import { SuspendedGameSearch } from "@/components/suspended-game-search";
import { GameGridSkeleton } from "@/components/game-grid-skeleton";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q;

  return (
    <div className="container mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">🎮 Indiefindr</h1>
        <p className="text-gray-600 text-lg mb-6">
          Discover indie games from Twitter buzz. Browse all games below or
          search semantically.
        </p>
        <SearchBox query={query} />
      </div>

      <Suspense fallback={<GameGridSkeleton />} key={query}>
        <SuspendedGameSearch query={query} />
      </Suspense>
    </div>
  );
}
