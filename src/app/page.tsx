import { Suspense } from "react";
import { SearchBox } from "@/components/search-box";
import { SuspendedGameSearch } from "@/components/suspended-game-search";
import { GameGridSkeleton } from "@/components/game-grid-skeleton";
import { searchGames } from "@/lib/search";
import type { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const query = (await searchParams).q;

  if (query) {
    try {
      const results = await searchGames(query);
      const count = results.length;
      const hasGamesWord = query.toLowerCase().includes("games");
      const queryText = hasGamesWord ? query : `${query} games`;

      if (count === 0) {
        return {
          title: `No ${queryText} found on Indiefindr`,
          description: `We couldn't find any indie ${queryText}. Try a different search or discover other amazing indie games on Indiefindr.`,
        };
      }

      return {
        title: `${count} ${queryText} on Indiefindr`,
        description: `Discover ${count} amazing indie ${queryText} with AI-powered recommendations and honest explanations on Indiefindr.`,
      };
    } catch (error) {
      const hasGamesWord = query.toLowerCase().includes("games");
      const queryText = hasGamesWord ? query : `${query} games`;
      return {
        title: `Discover ${queryText} on Indiefindr`,
        description: `Find the best indie ${queryText}. Discover hidden gems and your next favorite indie game on Indiefindr.`,
      };
    }
  }

  return {
    title: "Indiefindr - Discover Your Next Favorite Indie Game",
    description:
      "Discover your next favorite indie game with AI-powered recommendations and honest explanations.",
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q;

  return (
    <div className="py-12">
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
