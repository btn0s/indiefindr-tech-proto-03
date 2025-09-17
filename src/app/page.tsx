import path from "path";
import { promises as fs } from "fs";
import Image from "next/image";

interface TwitterUser {
  userName: string;
  name: string;
  profilePicture: string;
  followers: number;
  isBlueVerified: boolean;
}

interface TwitterVideoVariant {
  content_type: string;
  url: string;
  bitrate?: number;
}

interface TwitterMedia {
  type: string;
  media_url_https: string;
  url: string;
  display_url: string;
  expanded_url: string;
  video_info?: {
    duration_millis: number;
    aspect_ratio: number[];
    variants: TwitterVideoVariant[];
  };
  sizes: {
    large: { w: number; h: number };
    medium: { w: number; h: number };
    small: { w: number; h: number };
    thumb: { w: number; h: number };
  };
}

interface TwitterUrl {
  url: string;
  expanded_url: string;
  display_url: string;
  indices: number[];
}

interface TwitterQuoteTweet {
  id: string;
  text: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  author: TwitterUser;
  extendedEntities?: {
    media?: TwitterMedia[];
  };
  entities?: {
    urls?: TwitterUrl[];
  };
}

interface SteamProfile {
  appId: string;
  title: string;
  description: string;
  price: string;
  tags: string[];
  releaseDate: string;
  developer: string;
  publisher: string;
  images: string[];
}

interface AIMetadata {
  summary: string;
  gameTitles: string[];
  genres: string[];
  keyFeatures: string[];
  targetAudience: string;
  releaseStatus: string;
}

interface EnrichedTweet {
  id: string;
  url?: string;
  text?: string;
  fullText?: string;
  createdAt?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  author: {
    userName: string;
    url: string;
    name?: string;
    profilePicture?: string;
    followers?: number;
    isBlueVerified?: boolean;
  };
  isQuote?: boolean;
  quote?: TwitterQuoteTweet;
  extendedEntities?: {
    media?: TwitterMedia[];
  };
  entities?: {
    urls?: TwitterUrl[];
  };
  steamProfiles?: SteamProfile[];
  aiMetadata?: AIMetadata;
  embedding?: number[];
}

const loadData = async (): Promise<EnrichedTweet[]> => {
  const filePath = path.join(process.cwd(), "public/data/embed-results.json");
  const data = await fs.readFile(filePath, "utf-8");
  return JSON.parse(data);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const decodeHtmlEntities = (text: string) => {
  const entities: { [key: string]: string } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " ",
    "&apos;": "'",
    "&hellip;": "...",
    "&mdash;": "—",
    "&ndash;": "–",
  };

  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return entities[entity] || entity;
  });
};

const expandUrls = (text: string, urls?: TwitterUrl[], tweetId?: string) => {
  if (!urls || urls.length === 0) return text;

  let expandedText = text;
  // Filter out URLs that link to the tweet itself or media/cards
  const filteredUrls = urls.filter((url) => {
    const expandedUrl = url.expanded_url;
    const isTweetUrl =
      expandedUrl.includes("/status/") &&
      (expandedUrl.includes("x.com/") || expandedUrl.includes("twitter.com/"));
    const isMediaUrl =
      expandedUrl.includes("/photo/") || expandedUrl.includes("/video/");
    const isCardUrl = expandedUrl.includes("pbs.twimg.com/card_img");
    const isPicUrl =
      url.display_url.startsWith("pic.x.com/") ||
      url.display_url.startsWith("pic.twitter.com/");
    return !isTweetUrl && !isMediaUrl && !isCardUrl && !isPicUrl;
  });

  // Sort URLs by their position in the text (indices[0]) in descending order
  // to avoid index shifting when replacing
  const sortedUrls = [...filteredUrls].sort(
    (a, b) => b.indices[0] - a.indices[0]
  );

  sortedUrls.forEach((url) => {
    const shortUrl = url.url;
    const expandedUrl = url.expanded_url;
    expandedText = expandedText.replace(shortUrl, expandedUrl);
  });

  // Remove any remaining t.co links that weren't processed
  expandedText = expandedText.replace(/https:\/\/t\.co\/[a-zA-Z0-9]+/g, "");

  return expandedText;
};

const renderMedia = (media: TwitterMedia) => {
  if (media.type === "photo") {
    return (
      <div className="mt-3 rounded-lg overflow-hidden">
        <Image
          src={media.media_url_https}
          alt="Tweet media"
          width={media.sizes.large.w}
          height={media.sizes.large.h}
          className="w-full h-auto object-cover"
          unoptimized
        />
      </div>
    );
  }

  if (media.type === "video" && media.video_info) {
    // Find the best quality MP4 video
    const mp4Variant = media.video_info.variants
      .filter((v) => v.content_type === "video/mp4")
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    if (mp4Variant) {
      return (
        <div className="mt-3 rounded-lg overflow-hidden">
          <video
            src={mp4Variant.url}
            poster={media.media_url_https}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-auto max-h-96 object-cover"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
  }

  return null;
};

const renderSteamGame = (game: SteamProfile) => {
  return (
    <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-start gap-4">
        {game.images[0] && (
          <Image
            src={game.images[0]}
            alt={game.title}
            width={120}
            height={45}
            className="rounded object-cover"
            unoptimized
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg text-gray-900">
              {game.title}
            </h3>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
              {game.price}
            </span>
          </div>
          <p className="text-gray-700 text-sm mb-3 line-clamp-2">
            {game.description}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {game.tags.slice(0, 4).map((tag, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Developer: {game.developer}</div>
            <div>Publisher: {game.publisher}</div>
            <div>Release: {game.releaseDate}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderAIMetadata = (metadata: AIMetadata) => {
  return (
    <div className="mt-4 bg-gray-50 rounded-lg p-4 border">
      <h4 className="font-semibold text-sm text-gray-900 mb-2">AI Analysis</h4>
      <p className="text-sm text-gray-700 mb-3">{metadata.summary}</p>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="font-medium text-gray-600">Target Audience:</span>
          <p className="text-gray-800">{metadata.targetAudience}</p>
        </div>
        <div>
          <span className="font-medium text-gray-600">Release Status:</span>
          <p className="text-gray-800">{metadata.releaseStatus}</p>
        </div>
      </div>

      {metadata.keyFeatures.length > 0 && (
        <div className="mt-3">
          <span className="font-medium text-gray-600 text-xs">
            Key Features:
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {metadata.keyFeatures.slice(0, 3).map((feature, index) => (
              <span
                key={index}
                className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const renderQuoteTweet = (quote: TwitterQuoteTweet) => {
  return (
    <div className="mt-4 border-l-4 border-gray-300 pl-4 bg-gray-50 rounded-r-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Image
          src={quote.author.profilePicture}
          alt={quote.author.name}
          width={24}
          height={24}
          className="rounded-full"
        />
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900">
            {quote.author.name}
          </span>
          {quote.author.isBlueVerified && (
            <span className="text-blue-500 text-sm">✓</span>
          )}
          <span className="text-gray-500 text-sm">
            @{quote.author.userName}
          </span>
          <span className="text-gray-400 text-sm">•</span>
          <span className="text-gray-500 text-sm">
            {formatDate(quote.createdAt)}
          </span>
        </div>
      </div>

      <p className="text-gray-800 text-sm mb-3">
        {decodeHtmlEntities(
          expandUrls(quote.text, quote.entities?.urls, quote.id)
        )}
      </p>

      {quote.extendedEntities?.media &&
        quote.extendedEntities.media.length > 0 && (
          <div className="space-y-2">
            {quote.extendedEntities.media.map((media, index) => (
              <div key={index}>{renderMedia(media)}</div>
            ))}
          </div>
        )}

      <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
        <div className="flex items-center gap-1">
          <span>💬</span>
          <span>{formatNumber(quote.replyCount)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🔄</span>
          <span>{formatNumber(quote.retweetCount)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>❤️</span>
          <span>{formatNumber(quote.likeCount)}</span>
        </div>
      </div>
    </div>
  );
};

export default async function Home() {
  const tweets = await loadData();
  const tweetsWithGames = tweets.filter(
    (tweet) => tweet.steamProfiles && tweet.steamProfiles.length > 0
  );

  // Flatten all games from tweets into a single array
  const allGames = tweetsWithGames.flatMap((tweet) =>
    tweet.steamProfiles?.map((game) => ({
      ...game,
      tweetId: tweet.id,
      tweetAuthor: tweet.author.userName,
      tweetText: tweet.fullText || tweet.text,
      aiMetadata: tweet.aiMetadata,
      tweetUrl: tweet.url,
    })) || []
  );

  return (
    <div className="container mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🎮 Indiefindr
        </h1>
        <p className="text-gray-600 text-lg">
          Discover indie games from Twitter buzz
        </p>
        <div className="mt-4 flex justify-center gap-6 text-sm text-gray-500">
          <span>📊 {tweets.length} total tweets</span>
          <span>🎯 {allGames.length} games discovered</span>
          <span>🤖 AI analyzed & embedded</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {allGames.map((game, index) => (
          <div key={`${game.appId}-${game.tweetId}`} className="group">
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
                <h2 className="text-lg font-semibold truncate flex-1" title={game.title}>
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
              
              {/* AI Summary */}
              {game.aiMetadata && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                  <p className="text-gray-600 italic">
                    "{game.aiMetadata.summary}"
                  </p>
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
        ))}
      </div>

      {allGames.length === 0 && (
        <p className="text-center text-gray-500 mt-8">
          No games found. Run the pipeline to generate data!
        </p>
      )}
    </div>
  );
}
