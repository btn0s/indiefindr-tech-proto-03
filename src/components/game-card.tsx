"use client";

import Image from "next/image";
import Link from "next/link";
import { GameData } from "@/lib/types";

export const GameCard = ({
  game,
  query,
}: {
  game: any; // Accept both GameData and Algolia game structures
  query?: string;
}) => {
  // Handle both GameData (appId) and Algolia (app_id) structures
  const gameId = game.appId || game.app_id;
  const href = query
    ? `/game/${gameId}?from=${encodeURIComponent(query)}`
    : `/game/${gameId}`;

  // Handle different image structures
  const imageUrl = game.images?.[0] || game.header_image;
  const title = game.title || game.name;
  const developer =
    game.developer ||
    (Array.isArray(game.developers) ? game.developers[0] : game.developers) ||
    "Unknown Developer";
  const tags = game.tags || [];

  return (
    <Link href={href} className="group block">
      <div className="bg-muted rounded-lg overflow-hidden transition-all duration-300 aspect-[460/215]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
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
        <h2 className="text-lg font-semibold truncate" title={title}>
          {title}
        </h2>

        <div className="text-xs text-muted-foreground mb-2">
          <div>by {developer}</div>
          {/* {game.releaseDate && <div>Release: {game.releaseDate}</div>} */}
        </div>

        {game.matchReason && (
          <div className="text-xs text-foreground mb-4">{game.matchReason}</div>
        )}

        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 4).map((tag: string, tagIndex: number) => (
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
