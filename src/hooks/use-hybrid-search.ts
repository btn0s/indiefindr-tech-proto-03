"use client";

import { useState } from "react";
import { searchClient, ALGOLIA_INDEX, AlgoliaGame } from "@/lib/algolia";
import { GameData } from "@/lib/types";

interface HybridSearchState {
  hits: (AlgoliaGame | GameData)[];
  query: string;
  loading: boolean;
  error: string | null;
  nbHits: number;
  searchType: "keyword" | "semantic" | "hybrid";
}

export function useHybridSearch() {
  const [searchState, setSearchState] = useState<HybridSearchState>({
    hits: [],
    query: "",
    loading: false,
    error: null,
    nbHits: 0,
    searchType: "keyword",
  });

  const isNaturalLanguageQuery = (query: string): boolean => {
    // Detect if query is likely natural language vs simple keywords
    const naturalLanguageIndicators = [
      query.includes(" like "),
      query.includes(" with "),
      query.includes(" that "),
      query.split(" ").length > 4, // Increased threshold
      /\b(cozy|atmospheric|challenging|similar to|games like)\b/i.test(query),
      /\b(I want|looking for|find me|recommend)\b/i.test(query),
    ];

    return naturalLanguageIndicators.some((indicator) => indicator);
  };

  const search = async (query: string) => {
    console.log(`🔍 Search called with: "${query}"`);

    if (!query.trim()) {
      // Load initial Algolia results for empty query
      await searchAlgolia("");
      return;
    }

    setSearchState((prev) => ({ ...prev, loading: true, error: null, query }));

    try {
      if (isNaturalLanguageQuery(query)) {
        console.log(`🧠 Using semantic search for: "${query}"`);
        // Use semantic search for natural language
        await searchSemantic(query);
      } else {
        console.log(`⚡ Using Algolia search for: "${query}"`);
        // Use Algolia for simple keyword searches
        await searchAlgolia(query);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchState((prev) => ({
        ...prev,
        loading: false,
        error: "Search failed. Please try again.",
      }));
    }
  };

  const searchAlgolia = async (query: string) => {
    try {
      const { results } = await searchClient.search([
        {
          indexName: ALGOLIA_INDEX,
          params: {
            query,
            hitsPerPage: 20,
          },
        },
      ]);

      const result = results[0];
      if ("hits" in result) {
        setSearchState((prev) => ({
          ...prev,
          hits: result.hits as AlgoliaGame[],
          loading: false,
          nbHits: result.nbHits || 0,
          searchType: "keyword",
        }));
      }
    } catch (error) {
      throw error;
    }
  };

  const searchSemantic = async (query: string) => {
    try {
      const response = await fetch(
        `/api/semantic-search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("Semantic search failed");
      }

      const results = await response.json();

      setSearchState((prev) => ({
        ...prev,
        hits: results.games,
        loading: false,
        nbHits: results.games.length,
        searchType: "semantic",
      }));
    } catch (error) {
      throw error;
    }
  };

  const searchHybrid = async (query: string) => {
    // Get results from both systems and merge them
    setSearchState((prev) => ({ ...prev, loading: true, error: null, query }));

    try {
      const [algoliaResults, semanticResponse] = await Promise.all([
        searchClient.search([
          {
            indexName: ALGOLIA_INDEX,
            params: {
              query,
              hitsPerPage: 10,
            },
          },
        ]),
        fetch(`/api/semantic-search?q=${encodeURIComponent(query)}`),
      ]);

      if (!semanticResponse.ok) {
        throw new Error("Semantic search failed");
      }

      const semanticResults = await semanticResponse.json();

      // Merge and deduplicate results
      const algoliaResult = algoliaResults.results[0];
      const algoliaHits =
        "hits" in algoliaResult ? (algoliaResult.hits as AlgoliaGame[]) : [];
      const semanticHits = semanticResults.games;

      // Simple deduplication by app_id/appId
      const merged = [...algoliaHits];
      const algoliaIds = new Set(algoliaHits.map((hit) => hit.app_id));

      semanticHits.forEach((game: GameData) => {
        if (!algoliaIds.has(game.appId)) {
          merged.push(game as any); // Type assertion for now
        }
      });

      setSearchState((prev) => ({
        ...prev,
        hits: merged,
        loading: false,
        nbHits: merged.length,
        searchType: "hybrid",
      }));
    } catch (error) {
      throw error;
    }
  };

  return {
    ...searchState,
    search,
    searchAlgolia,
    searchSemantic,
    searchHybrid,
  };
}
