import { liteClient as algoliasearch } from "algoliasearch/lite";

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;

if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY) {
  throw new Error("Missing Algolia environment variables");
}

export const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
export const ALGOLIA_INDEX = "indiefindr_new";

export interface AlgoliaGame {
  objectID: string;
  app_id: string;
  steam_url: string;
  status: string;
  discovered_at: number;
  // Additional fields that might be added later
  name?: string;
  description?: string;
  price?: string;
  tags?: string[];
  developers?: string[];
  publishers?: string[];
  release_date?: string;
  screenshots?: string[];
  header_image?: string;
}
