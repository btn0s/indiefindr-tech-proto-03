// New modular search system
export { SearchOrchestrator } from "./orchestrator";
export { IntentClassifier } from "./intent-classifier";
export { searchCache } from "./cache";
export { DataLoader } from "./data-loader";
export * from "./types";
export * from "./strategies";

// Main search functions for backward compatibility
import { SearchOrchestrator } from "./orchestrator";
import { GameData } from "@/lib/types";

const orchestrator = SearchOrchestrator.getInstance();

/**
 * Main search function - replaces the old searchGames function
 */
export async function searchGames(query: string): Promise<GameData[]> {
  const response = await orchestrator.search(query);
  return response.results;
}

/**
 * Get all games - replaces the old getAllGames function
 */
export async function getAllGames(): Promise<GameData[]> {
  return orchestrator.getAllGames();
}

/**
 * Advanced search with full response metadata
 */
export async function searchWithMetadata(query: string, userId?: string) {
  return orchestrator.search(query, userId);
}
