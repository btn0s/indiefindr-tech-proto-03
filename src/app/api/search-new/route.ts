import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import models from "@/lib/ai/models";
import { searchClient, ALGOLIA_INDEX } from "@/lib/algolia";
import { GAMING_REFERENCE } from "@/lib/constants/gaming-reference";

// Remove unused interface - we'll match the existing API structure

function isNaturalLanguageQuery(query: string): boolean {
  const indicators = [
    query.includes(" like "),
    query.includes(" with "),
    query.includes(" that "),
    query.split(" ").length > 4,
    /\b(cozy|atmospheric|challenging|similar to|games like)\b/i.test(query),
    /\b(I want|looking for|find me|recommend)\b/i.test(query),
  ];
  return indicators.some((indicator) => indicator);
}

async function generateAlgoliaQueries(
  originalQuery: string
): Promise<string[]> {
  const { text } = await generateText({
    model: models.chatModelMini,
    temperature: 0.3,
    system: `You are an expert at converting natural language game queries into simple keyword searches for Algolia.

${GAMING_REFERENCE}

Convert the user's natural language query into 2-4 simple keyword searches that will find relevant games in Algolia.

Rules:
- Use simple keywords, not full sentences
- Focus on genres, mechanics, themes, art styles
- Each query should be 1-4 words max
- Return only the queries, one per line
- No explanations or extra text

Examples:
User: "I want cozy farming games with pixel art"
Output:
farming simulation
pixel art
cozy games
life sim

User: "challenging platformers like Celeste"
Output:
challenging platformer
precision platformer
difficult games
indie platformer`,
    prompt: `Convert this query into simple Algolia searches: "${originalQuery}"`,
  });

  return text
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0);
}

async function generateQueryVibe(originalQuery: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: models.chatModelMini,
      temperature: 0.7,
      system: `You are an expert at capturing the essence of gaming queries in exactly 10 words.

Extract the core vibe/mood/feeling the user wants from their query.

Examples:
"cozy farming games" → "relaxing peaceful farming simulation with wholesome creative gameplay elements"
"challenging platformers" → "difficult precise jumping games requiring skill mastery and patience"
"games like amongus" → "social deduction multiplayer suspense betrayal mystery with friends"

Return EXACTLY 10 words that capture the essence.`,
      prompt: `Extract the 10-word vibe for: "${originalQuery}"`,
    });

    return text.trim().split(" ").slice(0, 10).join(" ");
  } catch (error) {
    console.error("Failed to generate query vibe:", error);
    return `games matching ${originalQuery.split(" ").slice(0, 6).join(" ")}`;
  }
}

function calculateAlgoliaScore(game: any): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];
  const highlights = game._highlightResult || {};

  // Field weights (higher = more important)
  const fieldWeights = {
    name: 10,
    description: 8,
    semantic_description: 9,
    tags: 6,
    developers: 4,
    categories: 3,
  };

  // Check each field for matches
  Object.entries(fieldWeights).forEach(([field, weight]) => {
    const highlight = highlights[field];
    if (!highlight) return;

    // Handle arrays (like tags, developers)
    const items = Array.isArray(highlight) ? highlight : [highlight];

    items.forEach((item: any) => {
      if (item.matchLevel === "full") {
        score += weight * 2;
        reasons.push(`Perfect match in ${field}`);
      } else if (item.matchLevel === "partial") {
        const wordCount = item.matchedWords?.length || 0;
        score += weight * wordCount * 0.5;
        if (wordCount > 0) {
          reasons.push(`"${item.matchedWords.join(", ")}" in ${field}`);
        }
      }
    });
  });

  // Bonus for semantic description matches (AI-generated content)
  if (highlights.semantic_description?.matchLevel === "partial") {
    score += 5;
    reasons.push("AI-curated match");
  }

  // Generate reason
  const reason =
    reasons.length > 0 ? reasons.slice(0, 2).join(", ") : "Found via search";

  return { score: Math.round(score * 10) / 10, reason };
}

async function rankAndAnnotateResults(
  originalQuery: string,
  games: any[]
): Promise<any[]> {
  if (games.length === 0) return [];

  // Score based on Algolia match data
  return games
    .map((game) => {
      const { score, reason } = calculateAlgoliaScore(game);
      return {
        ...game,
        score,
        matchReason: reason,
      };
    })
    .filter((game) => game.score > 0) // Only keep games with actual matches
    .sort((a, b) => b.score - a.score); // Sort by score descending
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    console.log(`🔍 New search API called with: "${query}"`);
    console.log(`🔍 Page: ${page}`);
    console.log(`🔍 Page size: ${pageSize}`);

    if (!query.trim()) {
      // Return empty results for empty query
      return NextResponse.json({
        games: [],
        searchType: "keyword",
        totalHits: 0,
      });
    }

    console.log(`🔍 New search API called with: "${query}"`);

    if (!isNaturalLanguageQuery(query)) {
      // Simple keyword search - direct to Algolia
      console.log(`⚡ Using direct Algolia search for: "${query}"`);

      const { results } = await searchClient.search([
        {
          indexName: ALGOLIA_INDEX,
          params: {
            query,
            hitsPerPage: pageSize,
            page: page - 1, // Algolia uses 0-based pages
          },
        },
      ]);

      const result = results[0];
      const hits = "hits" in result ? result.hits : [];
      const totalHits = "hits" in result ? result.nbHits || 0 : 0;

      return NextResponse.json({
        games: hits,
        totalCount: totalHits,
        hasMore: page * pageSize < totalHits,
      });
    }

    // Complex query - LLM enhanced flow
    console.log(`🧠 Using LLM-enhanced search for: "${query}"`);

    // Step 1: Generate multiple Algolia queries + vibe (in parallel)
    const [algoliaQueries, queryVibe] = await Promise.all([
      generateAlgoliaQueries(query),
      generateQueryVibe(query),
    ]);
    console.log(`📝 Generated queries:`, algoliaQueries);
    console.log(`✨ Query vibe:`, queryVibe);

    // Step 2: Search Algolia with all queries in parallel
    const searchPromises = algoliaQueries.map((q) =>
      searchClient.search([
        {
          indexName: ALGOLIA_INDEX,
          params: {
            query: q,
            hitsPerPage: 10, // Fewer per query since we're combining
          },
        },
      ])
    );

    const allResults = await Promise.all(searchPromises);

    // Step 3: Combine and deduplicate results
    const allGames = new Map();
    allResults.forEach(({ results }) => {
      const result = results[0];
      if ("hits" in result) {
        result.hits.forEach((game: any) => {
          if (!allGames.has(game.app_id)) {
            allGames.set(game.app_id, game);
          }
        });
      }
    });

    const combinedGames = Array.from(allGames.values());
    console.log(
      `🔄 Combined ${combinedGames.length} unique games from ${algoliaQueries.length} queries`
    );

    // Step 4: LLM rank and annotate results
    const rankedGames = await rankAndAnnotateResults(query, combinedGames);
    console.log(`🎯 Ranked to ${rankedGames.length} relevant games`);

    // Step 5: Apply pagination to final results
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    // Step 5.5: Generate explanations for paginated games in parallel
    const paginatedGamesWithExplanations = await Promise.all(
      rankedGames.slice(startIndex, endIndex).map(async (game) => {
        try {
          const { text } = await generateText({
            model: models.chatModelMini,
            temperature: 0.6,
            system: `Create a 1-sentence compelling explanation for why this game matches what the user wants. Be enthusiastic and specific.`,
            prompt: `User wants: "${queryVibe}"
Game: "${game.name}" - ${game.description || "No description"}
Why this matches:`,
          });

          return { ...game, whyExplanation: text.trim() };
        } catch (error) {
          return {
            ...game,
            whyExplanation: `Perfect match for your ${queryVibe
              .split(" ")
              .slice(0, 3)
              .join(" ")} vibe!`,
          };
        }
      })
    );

    console.log(
      `✨ Generated explanations for ${paginatedGamesWithExplanations.length} games`
    );

    return NextResponse.json({
      games: paginatedGamesWithExplanations,
      totalCount: rankedGames.length,
      hasMore: endIndex < rankedGames.length,
      queryVibe,
    });
  } catch (error) {
    console.error("Search-new API error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
