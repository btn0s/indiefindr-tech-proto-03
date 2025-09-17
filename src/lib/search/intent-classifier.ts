import { generateObject } from "ai";
import { z } from "zod";
import models from "@/lib/ai/models";
import { SearchIntent } from "./types";

const intentSchema = z.object({
  type: z.enum(["semantic", "similar", "genre", "mood", "feature", "hybrid"]),
  confidence: z.number().min(0).max(1),
  entities: z.object({
    referenceGame: z.string().optional(),
    genres: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    mood: z.string().optional(),
    playModes: z.array(z.string()).optional(),
  }),
  searchStrategy: z.string(),
  reasoning: z.string().optional(),
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
      const { object } = await generateObject({
        model: models.chatModelMini,
        temperature: 0.1,
        schema: intentSchema,
        system: `You are an expert at classifying gaming search intents. Analyze the query and determine:

1. Intent Type:
   - "similar": User wants games similar to a specific game (e.g., "games like Hades", "similar to Among Us")
   - "genre": User searching by genre (e.g., "roguelike games", "puzzle platformers")
   - "mood": User searching by feeling/mood (e.g., "relaxing games", "challenging games")
   - "feature": User searching by specific features (e.g., "co-op games", "pixel art games")
   - "semantic": General descriptive search (e.g., "space exploration", "medieval fantasy")
   - "hybrid": Combines multiple intent types

2. Entities: Extract specific games, genres, features, moods, or play modes mentioned

3. Search Strategy: Recommend the best approach based on the intent

4. Confidence: Rate how confident you are in the classification (0-1)

Examples:
- "games like Celeste" → similar, referenceGame: "Celeste", confidence: 0.95
- "co-op puzzle games" → hybrid, features: ["co-op"], genres: ["puzzle"], confidence: 0.9
- "something relaxing" → mood, mood: "relaxing", confidence: 0.8`,
        prompt: `Classify this gaming search query: "${query}"`,
      });

      const intent: SearchIntent = {
        type: object.type,
        confidence: object.confidence,
        entities: object.entities,
        searchStrategy: object.searchStrategy,
        reasoning: object.reasoning,
      };

      // Cache the result
      this.cache.set(cacheKey, {
        intent,
        expires: Date.now() + this.CACHE_TTL_MS,
      });

      return intent;
    } catch (error) {
      console.error("Intent classification failed:", error);

      // Fallback to regex-based classification
      return this.fallbackClassification(query);
    }
  }

  private fallbackClassification(query: string): SearchIntent {
    const lowerQuery = query.toLowerCase();

    // Similar games pattern
    if (/(games?\s+)?(like|similar to)\s+/i.test(query)) {
      const referenceGame = query
        .replace(/^(games?\s+)?(like|similar to)\s+/i, "")
        .replace(/\s+(games?)?\s*$/i, "")
        .trim();

      return {
        type: "similar",
        confidence: 0.8,
        entities: { referenceGame },
        searchStrategy: "similar-games",
      };
    }

    // Co-op/multiplayer pattern
    if (/\b(co-?op|multiplayer|local|split.?screen)\b/i.test(lowerQuery)) {
      return {
        type: "feature",
        confidence: 0.7,
        entities: {
          features: ["multiplayer"],
          playModes: ["co-op", "multiplayer"],
        },
        searchStrategy: "feature-based",
      };
    }

    // Genre patterns
    const genrePatterns = [
      "roguelike",
      "platformer",
      "puzzle",
      "rpg",
      "strategy",
      "shooter",
      "racing",
      "simulation",
      "adventure",
      "action",
    ];

    const foundGenres = genrePatterns.filter((genre) =>
      lowerQuery.includes(genre)
    );

    if (foundGenres.length > 0) {
      return {
        type: "genre",
        confidence: 0.75,
        entities: { genres: foundGenres },
        searchStrategy: "genre-based",
      };
    }

    // Default to semantic search
    return {
      type: "semantic",
      confidence: 0.6,
      entities: {},
      searchStrategy: "semantic-search",
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}
