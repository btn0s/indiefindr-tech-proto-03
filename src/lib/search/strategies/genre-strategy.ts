import { embed } from "ai";
import { GameData } from "@/lib/types";
import { SearchContext, SearchIntent } from "../types";
import { BaseSearchStrategy } from "./base-strategy";
import models from "@/lib/ai/models";

export class GenreSearchStrategy extends BaseSearchStrategy {
  name = "genre-search";

  canHandle(intent: SearchIntent): boolean {
    return intent.type === "genre" && !!intent.entities.genres?.length;
  }

  async execute(context: SearchContext): Promise<GameData[]> {
    const { query, intent } = context;

    // Get semantic embedding for the query
    const { embedding: queryEmbedding } = await embed({
      model: models.embeddingModel,
      value: query,
    });

    // Load data
    const games = await this.dataLoader.loadReadyGames();
    const threshold = 0.15; // Lower threshold for genre matching

    const candidates = games
      .map((game) => {
        if (!game.embedding) return null;

        // Apply genre filters
        if (!this.matchesGenres(game, intent)) return null;

        const similarity = this.cosineSimilarity(
          queryEmbedding,
          game.embedding
        );
        if (similarity < threshold) return null;

        // Boost similarity for exact genre matches
        const genreBoost = this.calculateGenreBoost(game, intent);
        const boostedSimilarity = Math.min(1.0, similarity + genreBoost);

        return this.convertToGameData(game, boostedSimilarity);
      })
      .filter((game): game is GameData => game !== null);

    // Sort by similarity and deduplicate
    const sorted = candidates.sort(
      (a, b) => (b.similarity || 0) - (a.similarity || 0)
    );
    const deduplicated = this.deduplicateGames(sorted);

    return deduplicated.slice(0, 50);
  }

  private matchesGenres(game: any, intent: SearchIntent): boolean {
    const steamData = game.steam_data;
    const requestedGenres =
      intent.entities.genres?.map((g) => g.toLowerCase()) || [];

    return requestedGenres.some((requestedGenre) =>
      (steamData.genres || []).some((genre: any) =>
        this.isGenreMatch(genre.description.toLowerCase(), requestedGenre)
      )
    );
  }

  private isGenreMatch(gameTag: string, requestedGenre: string): boolean {
    // Direct match
    if (gameTag.includes(requestedGenre) || requestedGenre.includes(gameTag)) {
      return true;
    }

    // Genre synonyms and variations
    const genreMap: Record<string, string[]> = {
      roguelike: ["rogue-like", "roguelite", "rogue-lite"],
      platformer: ["platform", "metroidvania"],
      rpg: ["role-playing", "roleplaying"],
      strategy: ["tactical", "rts", "turn-based"],
      puzzle: ["brain teaser", "logic"],
      shooter: ["fps", "third-person shooter", "bullet hell"],
      racing: ["driving", "car"],
      simulation: ["sim", "simulator"],
      adventure: ["exploration"],
      action: ["arcade"],
    };

    // Check if requested genre has synonyms that match the game tag
    const synonyms = genreMap[requestedGenre] || [];
    if (synonyms.some((synonym) => gameTag.includes(synonym))) {
      return true;
    }

    // Check if game tag has synonyms that match the requested genre
    for (const [genre, genreSynonyms] of Object.entries(genreMap)) {
      if (gameTag.includes(genre) && genreSynonyms.includes(requestedGenre)) {
        return true;
      }
    }

    return false;
  }

  private calculateGenreBoost(game: any, intent: SearchIntent): number {
    const steamData = game.steam_data;
    const requestedGenres =
      intent.entities.genres?.map((g) => g.toLowerCase()) || [];

    let boost = 0;

    for (const requestedGenre of requestedGenres) {
      for (const genre of steamData.genres || []) {
        if (
          this.isGenreMatch(genre.description.toLowerCase(), requestedGenre)
        ) {
          boost += 0.1; // Small boost for each matching genre
        }
      }
    }

    return Math.min(0.3, boost); // Cap the boost at 0.3
  }
}
