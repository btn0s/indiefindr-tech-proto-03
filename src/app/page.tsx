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
          description: `Indiefindr surfaces the best new indie games that get buried on popular storefronts. Discover hidden gems you'll actually love.`,
          openGraph: {
            title: `No ${queryText} found on Indiefindr`,
            description: `Indiefindr surfaces the best new indie games that get buried on popular storefronts. Discover hidden gems you'll actually love.`,
            images: ["/og.png"],
          },
        };
      }

      return {
        title: `${count} ${queryText} on Indiefindr`,
        description: `Indiefindr surfaces the best new indie games that get buried on popular storefronts. Discover hidden gems you'll actually love.`,
        openGraph: {
          title: `${count} ${queryText} on Indiefindr`,
          description: `Indiefindr surfaces the best new indie games that get buried on popular storefronts. Discover hidden gems you'll actually love.`,
          images: ["/og.png"],
        },
      };
    } catch (error) {
      const hasGamesWord = query.toLowerCase().includes("games");
      const queryText = hasGamesWord ? query : `${query} games`;
      return {
        title: `Discover ${queryText} on Indiefindr`,
        description: `Indiefindr surfaces the best new indie games that get buried on popular storefronts. Discover hidden gems you'll actually love.`,
        openGraph: {
          title: `Discover ${queryText} on Indiefindr`,
          description: `Indiefindr surfaces the best new indie games that get buried on popular storefronts. Discover hidden gems you'll actually love.`,
          images: ["/og.png"],
        },
      };
    }
  }

  return {
    title: "Indiefindr - Discover Your Next Favorite Indie Game",
    description:
      "Indiefindr surfaces the best new indie games that get buried on popular storefronts. Discover hidden gems you'll actually love.",
    openGraph: {
      title: "Indiefindr - Discover Your Next Favorite Indie Game",
      description:
        "Indiefindr surfaces the best new indie games that get buried on popular storefronts. Discover hidden gems you'll actually love.",
      images: ["/og.png"],
    },
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
