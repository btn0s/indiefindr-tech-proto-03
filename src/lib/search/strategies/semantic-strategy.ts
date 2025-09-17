import { embed, generateText } from "ai";
import { GameData } from "@/lib/types";
import { SearchContext, SearchIntent } from "../types";
import { BaseSearchStrategy } from "./base-strategy";
import models from "@/lib/ai/models";
import { searchCache } from "../cache";

export class SemanticSearchStrategy extends BaseSearchStrategy {
  name = "semantic-search";

  private hydeCache = new Map<string, number[]>();

  canHandle(intent: SearchIntent): boolean {
    return intent.type === "semantic" || intent.type === "mood";
  }

  async execute(context: SearchContext): Promise<GameData[]> {
    const { query, intent } = context;

    // Get base embedding
    const { embedding: baseEmbedding } = await embed({
      model: models.embeddingModel,
      value: query,
    });

    let queryEmbedding = baseEmbedding;

    // Apply HyDE for short queries
    const tokenCount = query.trim().split(/\s+/).filter(Boolean).length;
    if (tokenCount <= 2) {
      queryEmbedding = await this.applyHyDE(query, baseEmbedding);
    }

    // Load data and perform similarity search
    const tweets = await this.dataLoader.loadEmbeddedData();
    const threshold = this.getThreshold(query, intent);

    const candidates = tweets
      .flatMap(
        (tweet) =>
          tweet.steamProfiles
            ?.map((game) => {
              if (!game.structured_metadata || !tweet.embedding) return null;

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

  private async applyHyDE(
    query: string,
    baseEmbedding: number[]
  ): Promise<number[]> {
    const cacheKey = query.toLowerCase().trim();

    let hydeEmbedding = this.hydeCache.get(cacheKey);
    if (!hydeEmbedding) {
      try {
        const { text: hypothetical } = await generateText({
          model: models.chatModelMini,
          temperature: 0,
          system: `You expand ultra-short search queries into dense game descriptors for semantic search. 
Focus on gameplay mechanics, visual style, and player experience. 
Prefer specific features over vague vibes. Keep under 24 words.

Examples:
- "roguelike" → "procedurally generated dungeon crawler with permadeath combat progression random levels"
- "cozy" → "relaxing peaceful gameplay low-stress exploration crafting wholesome atmosphere"
- "challenging" → "difficult gameplay precise timing skill-based mechanics demanding player mastery"`,
          prompt: `User query: "${query}"\n\nExpand this into a rich descriptor:`,
        });

        const { embedding } = await embed({
          model: models.embeddingModel,
          value: hypothetical.replaceAll("\n", " "),
        });

        hydeEmbedding = embedding;
        this.hydeCache.set(cacheKey, hydeEmbedding);
      } catch (error) {
        console.error("HyDE expansion failed:", error);
        return baseEmbedding;
      }
    }

    // Blend base and HyDE embeddings
    const hydeWeight = 0.65;
    const baseWeight = 0.35;

    return baseEmbedding.map(
      (v, i) => baseWeight * v + hydeWeight * (hydeEmbedding![i] as number)
    );
  }

  private getThreshold(query: string, intent: SearchIntent): number {
    // Lower threshold for short queries to be more permissive
    if (query.length <= 5) return 0.15;

    // Higher threshold for mood-based searches for better precision
    if (intent.type === "mood") return 0.3;

    return 0.25;
  }
}
