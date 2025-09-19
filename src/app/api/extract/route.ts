import { NextResponse } from "next/server";
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { CombinedSchema } from "./schema";

const MODEL = "google/gemini-2.5-pro";

export type LLMExtraction = z.infer<typeof CombinedSchema>;

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

  // Rich gameplay data
  gameplay_mechanics?: string[];
  game_formats?: string[];
  camera?: string[];
  modes?: string[];
  structure?: string[];

  // World and narrative
  setting?: string[];
  themes?: string[];

  // Experience design
  difficulty?: string[];

  // Aesthetics - the key addition for rich indexing
  art_style?: string[];
  audio_style?: string[];

  // Technical
  accessibility_features?: string[];

  // Content rating
  maturity?: string;
  content_flags?: string[];

  // Searchable content
  tag_names: string[];
  blurb_140?: string;
  blurb_400?: string;

  // Additional metadata for embeddings
  estimated_playtime?: string;
  complexity_level?: string;
  learning_curve?: string;
  replayability?: string;

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

    const { object: llm } = await generateObject({
      model: MODEL,
      mode: "json",
      schema: CombinedSchema,
      messages: [
        {
          role: "system",
          content:
            "You are a game analysis expert. Extract rich gaming data for indexing and embeddings. Use precise gaming terminology and be comprehensive.",
        },
        {
          role: "user",
          content: `Steam Data: ${JSON.stringify(steam, null, 2)}

Extract comprehensive game data focusing on:
- Specific game formats (arena_shooter, roguelike, etc.)
- Visual aesthetics (pixel_art, psx, lofi, realistic, etc.)
- Core mechanics and systems
- Searchable tags for discovery

Be detailed with aesthetics - capture retro styles, rendering techniques, and visual moods.`,
        },
      ],
    });

    const name = steam.name ?? "";
    const platforms = mapSteamPlatforms(steam.platforms);
    const releaseDate = steam.release_date?.date;
    const now = new Date().toISOString();

    const indexRow: GameIndexRow = {
      ...llm,
      // Override/add non-LLM fields
      id: `steam-${steam.steam_appid}`,
      slug: slugify(llm.title || name || String(steam.steam_appid)),
      title: llm.title || name || "Untitled",
      platforms,
      tag_names: Array.from(
        new Set(
          (llm.tag_names ?? [])
            .map((t: string) => t.trim().toLowerCase())
            .filter(Boolean)
        )
      ),
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
    });
  } catch (e: any) {
    if (NoObjectGeneratedError.isInstance(e)) {
      console.log("NoObjectGeneratedError");
      console.log("Cause:", e.cause);
      console.log("Text:", e.text);
      console.log("Response:", e.response);
      console.log("Usage:", e.usage);
      console.log("Finish Reason:", e.finishReason);
    }
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
