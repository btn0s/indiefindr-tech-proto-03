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
    <div className="container mx-auto px-6 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Indiefindr</h1>
        <p className="text-muted-foreground text-lg mb-6 max-w-lg mx-auto text-balance">
          Discover your next favorite indie game.
        </p>
        <div className="mx-auto max-w-lg">
          <SearchBox query={query} />
        </div>
      </div>

      <Suspense fallback={<GameGridSkeleton />} key={query}>
        <SuspendedGameSearch query={query} />
      </Suspense>
    </div>
  );
}
