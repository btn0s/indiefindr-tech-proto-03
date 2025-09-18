import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { Calendar, DollarSign } from "lucide-react";
import { SimilarGames } from "@/components/similar-games";
import { GameMediaCarousel } from "@/components/game-media-carousel";
import type { Metadata } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ appId: string }>;
}): Promise<Metadata> {
  const { appId } = await params;
  const game = await getGame(appId);

  if (!game) {
    return {
      title: "Game Not Found - Indiefindr",
      description: "The requested game could not be found on Indiefindr.",
    };
  }

  const steamData = game.steam_data;
  const title = steamData.name;
  const description =
    steamData.short_description || steamData.detailed_description || "";
  const developer = steamData.developers?.[0] || "";
  const genres =
    steamData.genres?.map((g: any) => g.description).join(", ") || "";
  const price =
    steamData.price_overview?.final_formatted ||
    (steamData.is_free ? "Free" : "");

  return {
    title: `${title} is on Indiefindr`,
    description: `${description} Developed by ${developer}. ${
      genres ? `Genres: ${genres}. ` : ""
    }${
      price ? `Price: ${price}. ` : ""
    }A hidden indie gem that deserves attention.`.trim(),
    openGraph: {
      title: `${title} - Hidden Indie Gem on Indiefindr`,
      description: description,
      images: steamData.header_image ? [steamData.header_image] : ["/og.png"],
    },
  };
}

async function getGame(appId: string) {
  const { data: game, error } = await supabase
    .from("games")
    .select("app_id, steam_data, semantic_description")
    .eq("app_id", appId)
    .eq("status", "ready")
    .single();

  if (error || !game) {
    return null;
  }

  return game;
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const game = await getGame(appId);

  if (!game) {
    notFound();
  }

  const steamData = game.steam_data;

  return (
    <div className="py-6">
      <Link
        href="/"
        className="text-blue-600 hover:underline mb-6 inline-block"
      >
        ← Back to search
      </Link>

      {/* Game Header Info - Full Width */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6 mb-8">
        {/* Header Image */}
        {steamData.header_image && (
          <div className="lg:w-80 flex-shrink-0">
            <Image
              src={steamData.header_image}
              alt={steamData.name}
              width={460}
              height={215}
              className="w-full rounded-lg shadow-lg"
              unoptimized
            />
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-3">{steamData.name}</h1>

          <div className="text-sm text-gray-600 space-y-1 mb-4">
            <div>by {steamData.developers?.join(", ") || "Unknown"}</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {steamData.release_date?.date || "TBA"}
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold">
                  {steamData.price_overview?.final_formatted ||
                    (steamData.is_free ? "Free" : "TBA")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {steamData.genres?.map((genre: any, index: number) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
              >
                {genre.description}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0">
          <a
            href={`https://store.steampowered.com/app/${appId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            View on Steam →
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Game Details */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">About This Game</h2>
            <p className="text-gray-700 leading-relaxed">
              {steamData.short_description ||
                steamData.detailed_description ||
                "No description available."}
            </p>
          </div>

          {/* Semantic Keywords */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Game Features</h2>
            <p className="text-sm text-gray-600 italic">
              {game.semantic_description}
            </p>
          </div>

          {/* Play Modes */}
          {steamData.categories && steamData.categories.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Play Modes</h2>
              <div className="flex flex-wrap gap-2">
                {steamData.categories.map((category: any, index: number) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                  >
                    {category.description}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Media Carousel */}
        <div>
          <GameMediaCarousel steamData={steamData} />
        </div>
      </div>

      {/* Similar Games Section */}
      <Suspense
        fallback={
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-6">Similar Games</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 aspect-[460/215] rounded-lg mb-2"></div>
                  <div className="bg-gray-200 h-4 rounded mb-1"></div>
                  <div className="bg-gray-200 h-3 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        }
      >
        <SimilarGames gameName={steamData.name} currentAppId={appId} />
      </Suspense>
    </div>
  );
}
