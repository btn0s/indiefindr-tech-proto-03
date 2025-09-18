"use client";

import Image from "next/image";
import Link from "next/link";
import { AlgoliaGame } from "@/lib/algolia";

export const AlgoliaGameCard = ({
  game,
  query,
}: {
  game: AlgoliaGame;
  query?: string;
}) => {
  const href = query
    ? `/game/${game.app_id}?from=${encodeURIComponent(query)}`
    : `/game/${game.app_id}`;

  return (
    <Link href={href} className="group block max-w-full">
      <div className="bg-muted rounded-lg overflow-hidden transition-all duration-300 aspect-[460/215]">
        {game.header_image ? (
          <Image
            src={game.header_image}
            alt={game.name || `Game ${game.app_id}`}
            width={460}
            height={215}
            className="w-full h-full object-cover rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 text-sm">No Image</span>
          </div>
        )}
      </div>

      <div className="p-2 flex flex-col">
        <h2
          className="text-lg font-semibold truncate"
          title={game.name || `Game ${game.app_id}`}
        >
          {game.name || `Steam Game ${game.app_id}`}
        </h2>

        <div className="text-xs text-muted-foreground mb-2">
          <div>by {game.developers?.join(", ") || "Unknown Developer"}</div>
          {/* {game.release_date && <div>Release: {game.release_date}</div>} */}
        </div>

        <div className="flex flex-wrap gap-1">
          {game.tags &&
            game.tags
              .filter((tag) => tag.toLowerCase() !== "indie")
              .slice(0, 4)
              .map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
        </div>
      </div>
    </Link>
  );
};
