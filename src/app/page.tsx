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

interface TwitterTweet {
  id: string;
  url: string;
  text: string;
  fullText: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  author: TwitterUser;
  isQuote?: boolean;
  quote?: TwitterQuoteTweet;
  extendedEntities?: {
    media?: TwitterMedia[];
  };
  entities?: {
    urls?: TwitterUrl[];
  };
}

const loadData = async (): Promise<TwitterTweet[]> => {
  const filePath = path.join(
    process.cwd(),
    "public/data/search-twitter-results.json"
  );
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Indiefindr Tech Proto 03
          </h1>
          <p className="text-gray-600">
            Found {tweets.length} tweets about upcoming indie games
          </p>
        </div>

        {tweets.map((tweet) => (
          <div
            key={tweet.id}
            className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
          >
            {/* Author info */}
            <div className="flex items-center gap-3 mb-4">
              <Image
                src={tweet.author.profilePicture}
                alt={tweet.author.name}
                width={48}
                height={48}
                className="rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {tweet.author.name}
                  </span>
                  {tweet.author.isBlueVerified && (
                    <span className="text-blue-500">✓</span>
                  )}
                  <span className="text-gray-500">
                    @{tweet.author.userName}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(tweet.createdAt)}
                </div>
              </div>
            </div>

            {/* Tweet content */}
            <div className="mb-4">
              <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                {decodeHtmlEntities(
                  expandUrls(tweet.fullText, tweet.entities?.urls, tweet.id)
                )}
              </p>
            </div>

            {/* Media content */}
            {tweet.extendedEntities?.media &&
              tweet.extendedEntities.media.length > 0 && (
                <div className="space-y-2">
                  {tweet.extendedEntities.media.map((media, index) => (
                    <div key={index}>{renderMedia(media)}</div>
                  ))}
                </div>
              )}

            {/* Engagement stats */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <span>💬</span>
                <span>{formatNumber(tweet.replyCount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🔄</span>
                <span>{formatNumber(tweet.retweetCount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>❤️</span>
                <span>{formatNumber(tweet.likeCount)}</span>
              </div>
            </div>

            {/* Quote tweet */}
            {tweet.isQuote && tweet.quote && renderQuoteTweet(tweet.quote)}

            {/* Tweet link */}
            <div className="mt-4 pt-4 border-t">
              <a
                href={tweet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View on Twitter →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
