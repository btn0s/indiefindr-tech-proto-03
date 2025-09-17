import { ApifyClient } from "apify-client";
import dEnv from "@/lib/dotenv";

dEnv();

if (!process.env.APIFY_TOKEN) {
  throw new Error("APIFY_TOKEN is not set");
}

const apifyClient = new ApifyClient({
  token: process.env.APIFY_TOKEN,
});

export default apifyClient;
