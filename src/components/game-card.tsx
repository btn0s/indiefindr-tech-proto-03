import Image from "next/image";

interface Game {
  appId: string;
  title: string;
  description: string;
  price: string;
  tags: string[];
  releaseDate: string;
  developer: string;
  publisher: string;
  images: string[];
  tweetId: string;
  tweetAuthor: string;
  tweetText?: string;
  tweetUrl?: string;
  aiMetadata?: {
    summary: string;
    gameTitles: string[];
    genres: string[];
    keyFeatures: string[];
    targetAudience: string;
    releaseStatus: string;
    // Enhanced fields for natural language search
    mood: string[];
    vibe: string[];
    atmosphere: string[];
    playStyle: string[];
    socialContext: string[];
    difficultyLevel: string;
    emotionalTone: string[];
    settingAesthetics: string[];
    gameplayFeel: string[];
  };
  similarity: number;
}

export const GameCard = ({ game }: { game: Game }) => {
  return (
    <div className="group">
      <div className="aspect-[460/215] bg-muted rounded-lg overflow-hidden">
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
      <div className="p-2">
        <div className="flex items-center justify-between mb-1">
          <h2
            className="text-lg font-semibold truncate flex-1"
            title={game.title}
          >
            {game.title}
          </h2>
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium ml-2">
            {game.price}
          </span>
        </div>

        {game.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {game.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mt-2">
          {game.tags.slice(0, 3).map((tag, tagIndex) => (
            <span
              key={tagIndex}
              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-2 text-xs text-gray-400 space-y-1">
          <div>by {game.developer}</div>
          {game.releaseDate && <div>Release: {game.releaseDate}</div>}
        </div>

        {/* AI Summary and Vibes */}
        {game.aiMetadata && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs space-y-2">
            <p className="text-gray-600 italic">"{game.aiMetadata.summary}"</p>

            {/* Mood/Vibe tags */}
            {(game.aiMetadata.vibe?.length > 0 ||
              game.aiMetadata.mood?.length > 0) && (
              <div className="flex flex-wrap gap-1">
                {game.aiMetadata.vibe?.slice(0, 2).map((vibe, index) => (
                  <span
                    key={index}
                    className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs"
                  >
                    {vibe}
                  </span>
                ))}
                {game.aiMetadata.mood?.slice(0, 1).map((mood, index) => (
                  <span
                    key={index}
                    className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs"
                  >
                    {mood}
                  </span>
                ))}
              </div>
            )}

            {/* Social Context */}
            {game.aiMetadata.socialContext?.length > 0 && (
              <div className="text-xs text-gray-500">
                <span className="font-medium">Perfect for:</span>{" "}
                {game.aiMetadata.socialContext.slice(0, 2).join(", ")}
              </div>
            )}
          </div>
        )}

        {/* Similarity score for search results */}
        {game.similarity < 1 && (
          <div className="mt-2 text-xs text-blue-500">
            Match: {Math.round(game.similarity * 100)}%
          </div>
        )}

        {/* Tweet attribution */}
        <div className="mt-2 text-xs text-gray-400">
          <span>Found by @{game.tweetAuthor}</span>
          {game.tweetUrl && (
            <a
              href={game.tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-500 hover:underline"
            >
              View Tweet →
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
