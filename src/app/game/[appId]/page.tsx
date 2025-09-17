import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { SimilarGames } from "@/components/similar-games";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <Link
        href="/"
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        ← Back to search
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Game Image */}
        <div>
          {steamData.header_image ? (
            <Image
              src={steamData.header_image}
              alt={steamData.name}
              width={460}
              height={215}
              className="w-full rounded-lg shadow-lg"
              unoptimized
            />
          ) : (
            <div className="w-full aspect-[460/215] bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">No Image</span>
            </div>
          )}

          {/* Screenshots */}
          {steamData.screenshots && steamData.screenshots.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Screenshots</h3>
              <div className="grid grid-cols-2 gap-2">
                {steamData.screenshots
                  .slice(0, 4)
                  .map((screenshot: any, index: number) => (
                    <Image
                      key={index}
                      src={screenshot.path_thumbnail}
                      alt={`Screenshot ${index + 1}`}
                      width={300}
                      height={169}
                      className="rounded-lg shadow-sm"
                      unoptimized
                    />
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Game Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{steamData.name}</h1>

            <div className="flex flex-wrap gap-2 mb-4">
              {steamData.genres?.map((genre: any, index: number) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                >
                  {genre.description}
                </span>
              ))}
            </div>

            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <div>
                <strong>Developer:</strong>{" "}
                {steamData.developers?.join(", ") || "Unknown"}
              </div>
              <div>
                <strong>Publisher:</strong>{" "}
                {steamData.publishers?.join(", ") || "Unknown"}
              </div>
              <div>
                <strong>Release:</strong>{" "}
                {steamData.release_date?.date || "TBA"}
              </div>
              <div>
                <strong>Price:</strong>{" "}
                {steamData.price_overview?.final_formatted ||
                  (steamData.is_free ? "Free" : "TBA")}
              </div>
            </div>
          </div>

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

          {/* Steam Link */}
          <div className="pt-4">
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
