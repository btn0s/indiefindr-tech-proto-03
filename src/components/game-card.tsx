"use client";

import Image from "next/image";
import Link from "next/link";
import { GameData } from "@/lib/types";

export const GameCard = ({
  game,
  query,
}: {
  game: GameData;
  query?: string;
}) => {
  const href = query
    ? `/game/${game.appId}?from=${encodeURIComponent(query)}`
    : `/game/${game.appId}`;

  return (
    <Link href={href} className="group block">
      <div className="bg-muted rounded-lg overflow-hidden transition-all duration-300 aspect-[460/215]">
        {game.images[0] ? (
          <Image
            src={game.images[0]}
            alt={game.title}
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
        <h2 className="text-lg font-semibold truncate" title={game.title}>
          {game.title}
        </h2>

        <div className="text-xs text-muted-foreground mb-2">
          <div>by {game.developer}</div>
          {/* {game.releaseDate && <div>Release: {game.releaseDate}</div>} */}
        </div>

        {game.matchReason && (
          <div className="text-xs text-foreground mb-4">{game.matchReason}</div>
        )}

        <div className="flex flex-wrap gap-1">
          {game.tags.slice(0, 4).map((tag, tagIndex) => (
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
