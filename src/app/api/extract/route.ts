import { NextResponse } from "next/server";
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import {
  BasicInfoSchema,
  GameplaySchema,
  WorldNarrativeSchema,
  AestheticsSchema,
  ExperienceSchema,
  ContentRatingSchema,
  TagsSchema,
  CombinedSchema,
} from "./schema";

const MODEL = "openai/gpt-4o";

// Combined type for the final result
export type LLMExtraction = z.infer<typeof BasicInfoSchema> &
  z.infer<typeof GameplaySchema> &
  z.infer<typeof WorldNarrativeSchema> &
  z.infer<typeof AestheticsSchema> &
  z.infer<typeof ExperienceSchema> &
  z.infer<typeof ContentRatingSchema> &
  z.infer<typeof TagsSchema>;

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

    const result = await generateObject({
      model: MODEL,
      mode: "json",
      schema: CombinedSchema,
      messages: [
        {
          role: "system",
          content:
            "Extract basic game information from Steam data. Be concise and accurate.",
        },
        {
          role: "user",
          content: `Steam Data: ${JSON.stringify(steam, null, 2)}

Extract:
- title: Clean game title
- blurb_140: Compelling 140-char description 
- blurb_400: Detailed description up to 600 chars

Focus on making the blurbs engaging for discovery.`,
        },
      ],
    });

    return result.toJsonResponse();
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
