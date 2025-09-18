"use client";

import { useState, useEffect } from "react";
import { searchClient, ALGOLIA_INDEX, AlgoliaGame } from "@/lib/algolia";

interface SearchState {
  hits: AlgoliaGame[];
  query: string;
  loading: boolean;
  error: string | null;
  nbHits: number;
  page: number;
  nbPages: number;
}

export function useAlgoliaSearch() {
  const [searchState, setSearchState] = useState<SearchState>({
    hits: [],
    query: "",
    loading: false,
    error: null,
    nbHits: 0,
    page: 0,
    nbPages: 0,
  });

  const search = async (query: string, page: number = 0) => {
    setSearchState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      query,
      page,
    }));

    try {
      const { results } = await searchClient.search([
        {
          indexName: ALGOLIA_INDEX,
          query,
          params: {
            page,
            hitsPerPage: 20,
          },
        },
      ]);

      const result = results[0];

      setSearchState((prev) => ({
        ...prev,
        hits: result.hits as AlgoliaGame[],
        loading: false,
        nbHits: result.nbHits,
        nbPages: result.nbPages,
      }));
    } catch (error) {
      console.error("Search error:", error);
      setSearchState((prev) => ({
        ...prev,
        loading: false,
        error: "Search failed. Please try again.",
      }));
    }
  };

  const loadInitialResults = async () => {
    setSearchState((prev) => ({ ...prev, loading: true }));

    try {
      const { results } = await searchClient.search([
        {
          indexName: ALGOLIA_INDEX,
          query: "",
          params: {
            page: 0,
            hitsPerPage: 20,
          },
        },
      ]);

      const result = results[0];

      setSearchState((prev) => ({
        ...prev,
        hits: result.hits as AlgoliaGame[],
        loading: false,
        nbHits: result.nbHits,
        nbPages: result.nbPages,
      }));
    } catch (error) {
      console.error("Initial load error:", error);
      setSearchState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load games. Please refresh the page.",
      }));
    }
  };

  const nextPage = () => {
    if (searchState.page < searchState.nbPages - 1) {
      search(searchState.query, searchState.page + 1);
    }
  };

  const prevPage = () => {
    if (searchState.page > 0) {
      search(searchState.query, searchState.page - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 0 && page < searchState.nbPages) {
      search(searchState.query, page);
    }
  };

  // Remove auto-loading - let the component control when to load

  return {
    ...searchState,
    search,
    nextPage,
    prevPage,
    goToPage,
    refetch: loadInitialResults,
  };
}
