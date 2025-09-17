import { embed } from "ai";
import { GameData } from "@/lib/types";
import { SearchContext, SearchIntent } from "../types";
import { BaseSearchStrategy } from "./base-strategy";
import models from "@/lib/ai/models";

export class FeatureSearchStrategy extends BaseSearchStrategy {
  name = "feature-search";

  canHandle(intent: SearchIntent): boolean {
    return (
      intent.type === "feature" &&
      (intent.entities.features?.length || intent.entities.playModes?.length)
    );
  }

  async execute(context: SearchContext): Promise<GameData[]> {
    const { query, intent } = context;

    // Get semantic embedding for the query
    const { embedding: queryEmbedding } = await embed({
      model: models.embeddingModel,
      value: query,
    });

    // Load data
    const tweets = await this.dataLoader.loadEmbeddedData();
    const threshold = 0.2;

    const candidates = tweets
      .flatMap(
        (tweet) =>
          tweet.steamProfiles
            ?.map((game) => {
              if (!game.structured_metadata || !tweet.embedding) return null;

              // Apply feature filters
              if (!this.matchesFeatures(game, intent)) return null;

              const similarity = this.cosineSimilarity(
                queryEmbedding,
                tweet.embedding
              );
              if (similarity < threshold) return null;

              return this.convertTweetToGameData(tweet, game, similarity);
            })
            .filter(Boolean) || []
      )
      .filter((game): game is GameData => game !== null);

    // Sort by similarity and deduplicate
    const sorted = candidates.sort(
      (a, b) => (b.similarity || 0) - (a.similarity || 0)
    );
    const deduplicated = this.deduplicateGames(sorted);

    return deduplicated.slice(0, 50);
  }

  private matchesFeatures(game: any, intent: SearchIntent): boolean {
    const metadata = game.structured_metadata;

    // Check play modes
    if (intent.entities.playModes?.length) {
      const hasRequiredMode = intent.entities.playModes.some((mode) =>
        metadata.play_modes.some(
          (gameMode: string) =>
            gameMode.toLowerCase().includes(mode.toLowerCase()) ||
            mode.toLowerCase().includes(gameMode.toLowerCase())
        )
      );
      if (!hasRequiredMode) return false;
    }

    // Check features (could be expanded with more specific feature matching)
    if (intent.entities.features?.length) {
      const features = intent.entities.features.map((f) => f.toLowerCase());

      // Check against play modes
      if (features.some((f) => ["coop", "co-op", "multiplayer"].includes(f))) {
        const hasMultiplayer = metadata.play_modes.some((mode: string) =>
          ["co-op", "multiplayer", "multi-player"].some((mp) =>
            mode.toLowerCase().includes(mp)
          )
        );
        if (!hasMultiplayer) return false;
      }

      // Check against tags
      const hasFeatureInTags = features.some((feature) =>
        metadata.steam_tags.some(
          (tag: string) =>
            tag.toLowerCase().includes(feature) ||
            feature.includes(tag.toLowerCase())
        )
      );

      if (!hasFeatureInTags && !intent.entities.playModes?.length) {
        return false;
      }
    }

    return true;
  }
}
