"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Loader2, Gamepad2 } from "lucide-react";
import { SteamGame } from "@/lib/types/steam";

interface DebugGameCardProps {
  appId: string;
  steamUrl: string;
}

export function DebugGameCard({ appId, steamUrl }: DebugGameCardProps) {
  const [gameData, setGameData] = useState<SteamGame | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  const extractData = async (steamData: any) => {
    setExtracting(true);
    setExtractError(null);
    try {
      const extractResponse = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steam: steamData }),
      });

      if (extractResponse.ok) {
        const extractData = await extractResponse.json();
        setExtractedData(extractData);
      } else {
        const errorText = await extractResponse.text();
        setExtractError(`Extract failed: ${errorText}`);
      }
    } catch (extractErr) {
      setExtractError(
        extractErr instanceof Error ? extractErr.message : "Unknown error"
      );
    } finally {
      setExtracting(false);
    }
  };

  const fetchSteamData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/steam/${appId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setGameData(data.data.data);

        // Now extract the data using the extract API
        extractData(data.data.data);
      } else {
        throw new Error(data.error || "Failed to fetch Steam data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSteamData();
  }, [appId]);

  return (
    <Card className="w-full p-0">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-6">
          {/* Column 1: Game Info - Vertical Stack */}
          <div className="space-y-4">
            {/* Game image */}
            <div className="w-full aspect-[460/215] bg-muted rounded overflow-hidden">
              {gameData?.header_image ? (
                <Image
                  src={gameData.header_image}
                  alt={gameData.name || "Game"}
                  width={460}
                  height={215}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>

            {/* Game title */}
            <div>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg" title={gameData?.name}>
                    {gameData?.name || "Loading..."}
                  </h3>
                  {gameData?.developers && (
                    <p className="text-sm text-muted-foreground">
                      by {gameData.developers.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Badge variant="secondary" className="text-xs">
                    App ID: {gameData?.steam_appid || appId}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(steamUrl, "_blank")}
                    className="h-8 w-8 p-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Description */}
            {gameData?.short_description && (
              <p className="text-sm text-muted-foreground">
                {gameData.short_description
                  .replace(/<[^>]*>?/g, "")
                  .replace(/&[^;]+;/g, "")}
              </p>
            )}

            {/* Price and release date */}
            <div className="flex items-center gap-4">
              {gameData?.is_free !== undefined && (
                <p className="text-sm font-medium text-green-600">
                  {gameData.is_free
                    ? "Free to Play"
                    : `Paid Game - ${
                        gameData.price_overview?.final_formatted ??
                        "Price not available"
                      }`}
                </p>
              )}
              {gameData?.release_date && (
                <p className="text-sm text-muted-foreground">
                  Release date: {gameData.release_date.date}
                </p>
              )}
            </div>

            {/* Website */}
            {gameData?.website && (
              <p className="text-sm text-blue-500 hover:underline">
                <a
                  href={gameData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {gameData.website}
                </a>
              </p>
            )}

            {/* Genres */}
            {gameData?.genres && (
              <div className="flex flex-wrap gap-1">
                {gameData.genres.map((genre, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {genre.description}
                  </Badge>
                ))}
              </div>
            )}

            {/* Categories */}
            {gameData?.categories && (
              <div className="flex flex-wrap gap-1">
                {gameData.categories.map((category, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {category.description}
                  </Badge>
                ))}
              </div>
            )}

            {/* Error and loading states */}
            {error && (
              <div className="text-sm text-destructive">Error: {error}</div>
            )}
            {loading && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching Steam data...
              </div>
            )}
          </div>

          {/* Column 2: Extracted Data & Raw Steam Data */}
          <div className="space-y-4">
            {/* AI Extracted Data */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">AI Extracted Data</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => gameData && extractData(gameData)}
                  disabled={extracting || !gameData}
                  className="h-6 px-2 text-xs"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Extracting...
                    </>
                  ) : (
                    "Retry Extract"
                  )}
                </Button>
              </div>
              <div className="bg-muted rounded p-3 max-h-96 overflow-y-auto">
                {extracting ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting data with AI...
                  </div>
                ) : extractError ? (
                  <div className="text-sm text-destructive">{extractError}</div>
                ) : extractedData ? (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(extractedData, null, 2)}
                  </pre>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No extracted data available
                  </div>
                )}
              </div>
            </div>

            {/* Raw Steam Data */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Raw Steam Data</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchSteamData}
                  disabled={loading}
                  className="h-6 px-2 text-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Loading...
                    </>
                  ) : (
                    "Retry Fetch"
                  )}
                </Button>
              </div>
              <div className="bg-muted rounded p-3 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading Steam data...
                  </div>
                ) : error ? (
                  <div className="text-sm text-destructive">Error: {error}</div>
                ) : gameData ? (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(gameData, null, 2)}
                  </pre>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No Steam data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
