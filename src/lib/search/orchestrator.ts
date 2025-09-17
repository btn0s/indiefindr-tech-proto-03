import { GameData } from "@/lib/types";
import { SearchResponse, SearchContext, SearchIntent } from "./types";
import { IntentClassifier } from "./intent-classifier";
import { searchCache } from "./cache";
import {
  SemanticSearchStrategy,
  SimilarGamesStrategy,
  GenreSearchStrategy,
  FeatureSearchStrategy,
  HybridSearchStrategy,
} from "./strategies";

export class SearchOrchestrator {
  private static instance: SearchOrchestrator;
  private intentClassifier = new IntentClassifier();
  private strategies = [
    new SemanticSearchStrategy(),
    new SimilarGamesStrategy(),
    new GenreSearchStrategy(),
    new FeatureSearchStrategy(),
    new HybridSearchStrategy(),
  ];

  static getInstance(): SearchOrchestrator {
    if (!SearchOrchestrator.instance) {
      SearchOrchestrator.instance = new SearchOrchestrator();
    }
    return SearchOrchestrator.instance;
  }

  async search(query: string, userId?: string): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!query || typeof query !== "string") {
        throw new Error("Query must be a non-empty string");
      }

      const normalizedQuery = query.trim();
      if (normalizedQuery.length === 0) {
        throw new Error("Query cannot be empty");
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(normalizedQuery, userId);
      const cached = await searchCache.get<SearchResponse>(cacheKey);

      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cacheHit: true,
          },
        };
      }

      // Classify intent
      const intent = await this.intentClassifier.classify(normalizedQuery);

      // Create search context
      const context: SearchContext = {
        query: normalizedQuery,
        intent,
        userId,
        // TODO: Add user preferences if available
      };

      // Find and execute appropriate strategy
      const strategy = this.selectStrategy(intent);
      const results = await strategy.execute(context);

      // Build response
      const processingTimeMs = Date.now() - startTime;
      const response: SearchResponse = {
        results,
        metadata: {
          query: normalizedQuery,
          intent,
          searchType: intent.type,
          processingTimeMs,
          resultCount: results.length,
          cacheHit: false,
          strategy: strategy.name,
        },
      };

      // Add reference game info for similar searches
      if (intent.type === "similar" && intent.entities.referenceGame) {
        response.referenceGame = {
          name: intent.entities.referenceGame,
          steamUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(
            intent.entities.referenceGame
          )}`,
          isIndie: true, // TODO: Determine this properly
        };
      }

      // Cache the response
      const cacheTTL = this.getCacheTTL(intent, results.length);
      await searchCache.set(cacheKey, response, cacheTTL);

      // Log search for analytics
      this.logSearch(context, response);

      return response;
    } catch (error) {
      console.error("Search orchestration failed:", error);

      // Return error response
      return {
        results: [],
        metadata: {
          query,
          intent: {
            type: "semantic",
            confidence: 0,
            entities: {},
            searchStrategy: "fallback",
          },
          searchType: "error",
          processingTimeMs: Date.now() - startTime,
          resultCount: 0,
          cacheHit: false,
          strategy: "error",
        },
      };
    }
  }

  private selectStrategy(intent: SearchIntent) {
    // Find the first strategy that can handle this intent
    const strategy = this.strategies.find((s) => s.canHandle(intent));

    if (!strategy) {
      console.warn(
        `No strategy found for intent type: ${intent.type}, falling back to semantic`
      );
      return new SemanticSearchStrategy();
    }

    return strategy;
  }

  private generateCacheKey(query: string, userId?: string): string {
    const baseKey = `search:${query.toLowerCase()}`;
    return userId ? `${baseKey}:user:${userId}` : baseKey;
  }

  private getCacheTTL(intent: SearchIntent, resultCount: number): number {
    // Base TTL of 5 minutes
    let ttl = 5 * 60 * 1000;

    // Longer cache for high-confidence results
    if (intent.confidence > 0.8) {
      ttl *= 2;
    }

    // Shorter cache for low-quality results
    if (resultCount < 5) {
      ttl /= 2;
    }

    // Very short cache for similar game searches (they might change frequently)
    if (intent.type === "similar") {
      ttl = Math.min(ttl, 2 * 60 * 1000);
    }

    return ttl;
  }

  private logSearch(context: SearchContext, response: SearchResponse): void {
    // TODO: Implement proper analytics logging
    console.log(`🔍 Search completed:`, {
      query: context.query,
      intentType: context.intent.type,
      intentConfidence: context.intent.confidence,
      strategy: response.metadata.strategy,
      resultCount: response.metadata.resultCount,
      processingTime: response.metadata.processingTimeMs + "ms",
      cacheHit: response.metadata.cacheHit,
    });
  }

  // Utility methods for external use
  async getAllGames(): Promise<GameData[]> {
    const cacheKey = "all_games";
    const cached = await searchCache.get<GameData[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Use semantic strategy with a broad query to get all games
      const semanticStrategy = new SemanticSearchStrategy();
      const context: SearchContext = {
        query: "indie games",
        intent: {
          type: "semantic",
          confidence: 1,
          entities: {},
          searchStrategy: "get-all",
        },
      };

      const results = await semanticStrategy.execute(context);

      // Cache for 10 minutes
      await searchCache.set(cacheKey, results, 10 * 60 * 1000);

      return results;
    } catch (error) {
      console.error("Failed to get all games:", error);
      return [];
    }
  }

  clearCache(): Promise<void> {
    return searchCache.clear();
  }
}
