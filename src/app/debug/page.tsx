"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ExternalLink, Gamepad2 } from "lucide-react";
import { DebugGameCard } from "@/components/debug-game-card";

interface SteamLink {
  url: string;
  appId: string;
}

interface Tweet {
  id: string;
  text: string;
  author: string;
  steamLinks: SteamLink[];
  url: string;
}

interface HuntResult {
  tweets: Tweet[];
  steamLinks: SteamLink[];
  summary: {
    totalTweets: number;
    totalSteamLinks: number;
    uniqueSteamLinks: number;
    searchTerm: string;
    limit: number;
  };
}

export default function DebugPage() {
  const [searchTerm, setSearchTerm] = useState('"wishlist on steam"');
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HuntResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runHunt = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({
        search: searchTerm,
        limit: limit.toString(),
      });

      const response = await fetch(`/api/debug-hunt?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run hunt");
      }

      if (data.success) {
        setResult(data.data);
      } else {
        throw new Error(data.error || "Hunt failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debug Hunt</h1>
          <p className="text-sm text-muted-foreground">
            Test hunt functionality
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder='"wishlist on steam"'
            className="w-48"
          />
          <Input
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
            min="1"
            max="100"
            className="w-20"
          />
          <Button onClick={runHunt} disabled={loading} size="sm">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Gamepad2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Compact Summary */}
          <div className="flex items-center gap-6 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {result.summary.totalTweets} tweets
              </Badge>
              <Badge variant="outline">
                {result.summary.uniqueSteamLinks} games
              </Badge>
              <Badge variant="default">{result.summary.searchTerm}</Badge>
            </div>
          </div>

          {/* Tabs for Games and Tweets */}
          <Tabs defaultValue="games" className="w-full">
            <TabsList>
              <TabsTrigger value="games">
                Games ({result.steamLinks.length})
              </TabsTrigger>
              <TabsTrigger value="tweets">
                Tweets ({result.tweets.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="games" className="space-y-4">
              {result.steamLinks.length > 0 ? (
                <div className="space-y-3">
                  {result.steamLinks.map((link, index) => (
                    <DebugGameCard
                      key={index}
                      appId={link.appId}
                      steamUrl={link.url}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Gamepad2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No games found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="tweets"
              className="space-y-2 max-h-96 overflow-y-auto"
            >
              {result.tweets.length > 0 ? (
                result.tweets.map((tweet) => (
                  <div key={tweet.id} className="border rounded-lg p-3 text-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          @{tweet.author}
                        </Badge>
                        {tweet.steamLinks.length > 0 && (
                          <Badge variant="default" className="text-xs">
                            {tweet.steamLinks.length} game
                            {tweet.steamLinks.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(tweet.url, "_blank")}
                        className="h-6 w-6 p-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs mb-2 line-clamp-2">{tweet.text}</p>
                    {tweet.steamLinks.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tweet.steamLinks.map((link, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {link.appId}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tweets found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
