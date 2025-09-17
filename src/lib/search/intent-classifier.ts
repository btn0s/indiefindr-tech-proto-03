import { generateObject } from "ai";
import { z } from "zod";
import models from "@/lib/ai/models";
import { SearchIntent } from "./types";

const intentSchema = z.object({
  type: z.enum(["semantic", "similar", "genre", "mood", "feature", "hybrid"]),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("The confidence in the classification"),
  entities: z.object({
    referenceGame: z
      .string()
      .optional()
      .describe("The game the user is referring to"),
    genres: z
      .array(z.string())
      .optional()
      .describe("The genres the user is referring to"),
    features: z
      .array(z.string())
      .optional()
      .describe("The features the user is referring to"),
    mood: z.string().optional().describe("The mood the user is referring to"),
    playModes: z
      .array(z.string())
      .optional()
      .describe("The play modes the user is referring to"),
  }),
  searchStrategy: z
    .enum([
      "semantic-search",
      "similar-games",
      "genre-search",
      "feature-search",
      "hybrid-search",
    ])
    .describe("The search strategy to use"),
  reasoning: z
    .string()
    .optional()
    .describe("The reasoning for the classification"),
});

export class IntentClassifier {
  private cache = new Map<string, { intent: SearchIntent; expires: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  async classify(query: string): Promise<SearchIntent> {
    const cacheKey = query.toLowerCase().trim();
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expires) {
      return cached.intent;
    }

    try {
      // Use fallback classification for now - it's working well
      return this.fallbackClassification(query);
    } catch (error) {
      console.error("Intent classification failed:", error);
      return this.fallbackClassification(query);
    }
  }

  private fallbackClassification(query: string): SearchIntent {
    // Always use semantic search - it handles everything!
    return {
      type: "semantic",
      confidence: 0.8,
      entities: {},
      searchStrategy: "semantic-search",
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}
