import { GameData } from "@/lib/types";
import { SearchContext, SearchIntent } from "../types";
import { BaseSearchStrategy } from "./base-strategy";
import { SemanticSearchStrategy } from "./semantic-strategy";
import { GenreSearchStrategy } from "./genre-strategy";
import { FeatureSearchStrategy } from "./feature-strategy";
import { SimilarGamesStrategy } from "./similar-strategy";

export class HybridSearchStrategy extends BaseSearchStrategy {
  name = "hybrid-search";

  private strategies: BaseSearchStrategy[];

  constructor() {
    super();
    this.strategies = [
      new SemanticSearchStrategy(),
      new GenreSearchStrategy(),
      new FeatureSearchStrategy(),
      new SimilarGamesStrategy(),
    ];
  }

  canHandle(intent: SearchIntent): boolean {
    return intent.type === "hybrid" || this.hasMultipleIntentTypes(intent);
  }

  async execute(context: SearchContext): Promise<GameData[]> {
    const { intent } = context;

    // Find all applicable strategies
    const applicableStrategies = this.strategies.filter((strategy) =>
      strategy.canHandle(intent)
    );

    if (applicableStrategies.length === 0) {
      // Fallback to semantic search
      const semanticStrategy = new SemanticSearchStrategy();
      return await semanticStrategy.execute(context);
    }

    // Execute all applicable strategies in parallel
    const results = await Promise.all(
      applicableStrategies.map(async (strategy) => {
        try {
          const strategyResults = await strategy.execute(context);
          return { strategy: strategy.name, results: strategyResults };
        } catch (error) {
          console.error(`Strategy ${strategy.name} failed:`, error);
          return { strategy: strategy.name, results: [] };
        }
      })
    );

    // Merge and rank results
    return this.mergeResults(results, intent);
  }

  private hasMultipleIntentTypes(intent: SearchIntent): boolean {
    const entityCount = Object.values(intent.entities).filter((value) =>
      Array.isArray(value) ? value.length > 0 : !!value
    ).length;

    return entityCount > 1;
  }

  private mergeResults(
    results: Array<{ strategy: string; results: GameData[] }>,
    intent: SearchIntent
  ): GameData[] {
    // Create a map to track games and their scores from different strategies
    const gameScores = new Map<
      string,
      {
        game: GameData;
        scores: Array<{ strategy: string; score: number; rank: number }>;
        totalScore: number;
      }
    >();

    // Process results from each strategy
    results.forEach(({ strategy, results: strategyResults }) => {
      strategyResults.forEach((game, index) => {
        const key = game.appId ? String(game.appId) : game.title.toLowerCase();

        if (!gameScores.has(key)) {
          gameScores.set(key, {
            game,
            scores: [],
            totalScore: 0,
          });
        }

        const gameScore = gameScores.get(key)!;

        // Calculate score based on similarity and rank
        const rankScore = Math.max(0, 1 - index / strategyResults.length);
        const similarityScore = game.similarity || 0;
        const combinedScore = rankScore * 0.4 + similarityScore * 0.6;

        gameScore.scores.push({
          strategy,
          score: combinedScore,
          rank: index + 1,
        });
      });
    });

    // Calculate final scores with strategy weights
    const strategyWeights = this.getStrategyWeights(intent);

    gameScores.forEach((gameScore) => {
      gameScore.totalScore = gameScore.scores.reduce((total, score) => {
        const weight = strategyWeights[score.strategy] || 1;
        return total + score.score * weight;
      }, 0);

      // Boost games that appear in multiple strategies
      const strategyBonus = Math.min(0.2, (gameScore.scores.length - 1) * 0.1);
      gameScore.totalScore += strategyBonus;
    });

    // Sort by total score and return deduplicated results
    const sortedGames = Array.from(gameScores.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .map(({ game, totalScore }) => ({
        ...game,
        similarity: totalScore, // Update similarity with combined score
      }));

    return sortedGames.slice(0, 50);
  }

  private getStrategyWeights(intent: SearchIntent): Record<string, number> {
    const weights: Record<string, number> = {
      "semantic-search": 1.0,
      "genre-search": 1.0,
      "feature-search": 1.0,
      "similar-games": 1.0,
    };

    // Adjust weights based on intent confidence and entities
    if (intent.entities.genres?.length) {
      weights["genre-search"] = 1.3;
    }

    if (intent.entities.features?.length || intent.entities.playModes?.length) {
      weights["feature-search"] = 1.3;
    }

    if (intent.entities.referenceGame) {
      weights["similar-games"] = 1.5;
    }

    if (intent.confidence < 0.7) {
      // Lower confidence means we should rely more on semantic search
      weights["semantic-search"] = 1.2;
    }

    return weights;
  }
}
