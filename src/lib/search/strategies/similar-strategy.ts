import { embed } from "ai";
import { GameData } from "@/lib/types";
import { SearchContext, SearchIntent } from "../types";
import { BaseSearchStrategy } from "./base-strategy";
import models from "@/lib/ai/models";

export class SimilarGamesStrategy extends BaseSearchStrategy {
  name = "similar-games";

  canHandle(intent: SearchIntent): boolean {
    return intent.type === "similar" && !!intent.entities.referenceGame;
  }

  async execute(context: SearchContext): Promise<GameData[]> {
    const { intent } = context;
    const referenceGame = intent.entities.referenceGame;

    if (!referenceGame) {
      throw new Error("Reference game is required for similar games search");
    }

    // Get embedding for the reference game
    const { embedding: referenceEmbedding } = await embed({
      model: models.embeddingModel,
      value: referenceGame,
    });

    // Load data and find similar games
    const games = await this.dataLoader.loadReadyGames();
    const threshold = 0.2; // Lower threshold for similar games

    const candidates = games
      .map((game) => {
        if (!game.embedding) return null;

        // Skip if this is the reference game itself
        if (
          game.steam_data.name
            .toLowerCase()
            .includes(referenceGame.toLowerCase()) ||
          referenceGame
            .toLowerCase()
            .includes(game.steam_data.name.toLowerCase())
        ) {
          return null;
        }

        const similarity = this.cosineSimilarity(
          referenceEmbedding,
          game.embedding
        );
        if (similarity < threshold) return null;

        return this.convertToGameData(game, similarity);
      })
      .filter((game): game is GameData => game !== null);

    // Sort by similarity and deduplicate
    const sorted = candidates.sort(
      (a, b) => (b.similarity || 0) - (a.similarity || 0)
    );
    const deduplicated = this.deduplicateGames(sorted);

    return deduplicated.slice(0, 50);
  }
}
