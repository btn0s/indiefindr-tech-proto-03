import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import models from "@/lib/ai/models";

export async function POST(request: NextRequest) {
  try {
    const { gameName, gameDescription, queryVibe } = await request.json();

    if (!gameName || !gameDescription || !queryVibe) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: gameName, gameDescription, queryVibe",
        },
        { status: 400 }
      );
    }

    const { text } = await generateText({
      model: models.chatModelMini,
      temperature: 0.6,
      system: `You are an expert indie game curator who creates compelling, personalized explanations for why specific games match what users are looking for.

Create a 1-2 sentence explanation that:
- Connects the game's features to the user's desired vibe
- Uses engaging, enthusiastic language
- Focuses on the most relevant aspects
- Sounds natural and conversational

Keep it concise but compelling - like a friend recommending a game.`,
      prompt: `User wants: "${queryVibe}"

Game: "${gameName}"
Description: "${gameDescription}"

Explain why this game matches what they're looking for:`,
    });

    return NextResponse.json({
      explanation: text.trim(),
    });
  } catch (error) {
    console.error("Why API error:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}
