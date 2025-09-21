import { NextResponse } from "next/server";
import { NoObjectGeneratedError } from "ai";
import { HierarchicalGameClassifier } from "../../../lib/ai/hierarchical-classifier";

const MODEL = "moonshotai/kimi-k2";

type Platform = "windows" | "mac" | "linux";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
function mapSteamPlatforms(p?: {
  windows?: boolean;
  mac?: boolean;
  linux?: boolean;
}): Platform[] {
  const out: Platform[] = [];
  if (p?.windows) out.push("windows");
  if (p?.mac) out.push("mac");
  if (p?.linux) out.push("linux");
  return out;
}

type GameIndexRow = {
  id: string;
  slug: string;
  title: string;
  platforms: Platform[];

  // Hierarchical classification results
  primary_genres: string[];
  core_mechanics: string[];
  game_structure: string;
  player_interaction: string;
  art_direction: string;
  perspective: string;
  setting_period: string;
  mood_atmosphere: string;
  difficulty_approach: string;
  time_commitment: string;

  // Searchable content
  tag_names: string[];
  blurb_140: string;
  blurb_400: string;

  // Quality metrics
  overall_confidence: number;
  individual_confidences: Record<string, number>;

  // Media and Steam data
  thumb?: string;
  header?: string;
  release_date?: string;
  steam_appid?: number;
  updated_at: string;
};

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { steam } = await req.json();

    if (!steam)
      return NextResponse.json(
        { error: "Missing 'steam' in body." },
        { status: 400 }
      );

    // Initialize the hierarchical classifier
    const classifier = new HierarchicalGameClassifier(MODEL);
    
    // Run hierarchical classification
    const classification = await classifier.classifyGame(steam);

    const name = steam.name ?? "";
    const platforms = mapSteamPlatforms(steam.platforms);
    const releaseDate = steam.release_date?.date;
    const now = new Date().toISOString();

    const indexRow: GameIndexRow = {
      // Basic identifiers
      id: `steam-${steam.steam_appid}`,
      slug: slugify(classification.title || name || String(steam.steam_appid)),
      title: classification.title || name || "Untitled",
      platforms,

      // Hierarchical classification results
      primary_genres: classification.primary_genres,
      core_mechanics: classification.core_mechanics,
      game_structure: classification.game_structure,
      player_interaction: classification.player_interaction,
      art_direction: classification.art_direction,
      perspective: classification.perspective,
      setting_period: classification.setting_period,
      mood_atmosphere: classification.mood_atmosphere,
      difficulty_approach: classification.difficulty_approach,
      time_commitment: classification.time_commitment,

      // Searchable content
      tag_names: classification.searchable_tags,
      blurb_140: classification.blurb_140,
      blurb_400: classification.blurb_400,

      // Quality metrics
      overall_confidence: classification.overall_confidence,
      individual_confidences: classification.individual_confidences,

      // Steam metadata
      thumb: steam.capsule_image ?? undefined,
      header: steam.header_image ?? undefined,
      release_date: releaseDate,
      steam_appid: steam.steam_appid,
      updated_at: now,
    };

    return NextResponse.json({
      ok: true,
      indexRow,
      classification_summary: {
        primary_genres: classification.primary_genres,
        overall_confidence: classification.overall_confidence,
        total_tags: classification.searchable_tags.length,
        facets_classified: Object.keys(classification.individual_confidences).length
      }
    });
  } catch (e: any) {
    if (NoObjectGeneratedError.isInstance(e)) {
      console.log("NoObjectGeneratedError");
      console.log("Cause:", e.cause);
      console.log("Text:", e.text);
      console.log("Response:", e.response);
      console.log("Usage:", e.usage);
      console.log("Finish Reason:", e.finishReason);
    } else {
      console.error("Unknown error", e);
    }
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
