import { generateObject } from "ai";
import {
  PrimaryClassificationSchema,
  GameplayMechanicsSchema,
  GameStructureSchema,
  PlayerInteractionSchema,
  VisualArtSchema,
  CameraPerspectiveSchema,
  SettingSchema,
  MoodSchema,
  DifficultySchema,
  TimeCommitmentSchema,
  BasicInfoSchema,
  HierarchicalClassificationResult,
} from "../../app/api/extract/hierarchical-schemas";

export class HierarchicalGameClassifier {
  private model: string;

  constructor(model: string = "moonshotai/kimi-k2") {
    this.model = model;
  }

  async classifyGame(
    steamData: any
  ): Promise<typeof HierarchicalClassificationResult._type> {
    const gameContext = this.buildGameContext(steamData);

    // Run all classifications in parallel - each with small, focused enums
    const [
      basicInfo,
      primaryClassification,
      gameplayMechanics,
      gameStructure,
      playerInteraction,
      visualArt,
      cameraPerspective,
      setting,
      mood,
      difficulty,
      timeCommitment,
    ] = await Promise.all([
      this.getBasicInfo(gameContext),
      this.getPrimaryClassification(gameContext),
      this.getGameplayMechanics(gameContext),
      this.getGameStructure(gameContext),
      this.getPlayerInteraction(gameContext),
      this.getVisualArt(gameContext),
      this.getCameraPerspective(gameContext),
      this.getSetting(gameContext),
      this.getMood(gameContext),
      this.getDifficulty(gameContext),
      this.getTimeCommitment(gameContext),
    ]);

    // Generate searchable tags from all classifications
    const searchableTags = this.generateSearchableTags({
      primaryClassification,
      gameplayMechanics,
      gameStructure,
      playerInteraction,
      visualArt,
      cameraPerspective,
      setting,
      mood,
      difficulty,
      timeCommitment,
    });

    // Calculate overall confidence
    const individualConfidences = {
      primary: primaryClassification.confidence,
      mechanics: gameplayMechanics.confidence,
      structure: gameStructure.confidence,
      interaction: playerInteraction.confidence,
      visual: visualArt.confidence,
      camera: cameraPerspective.confidence,
      setting: setting.confidence,
      mood: mood.confidence,
      difficulty: difficulty.confidence,
      time: timeCommitment.confidence,
    };

    const overallConfidence =
      Object.values(individualConfidences).reduce(
        (sum, conf) => sum + conf,
        0
      ) / Object.keys(individualConfidences).length;

    return {
      // Basic info
      title: basicInfo.title,
      blurb_140: basicInfo.blurb_140,
      blurb_400: basicInfo.blurb_400,

      // Hierarchical classifications
      primary_genres: primaryClassification.primary_genres,
      core_mechanics: gameplayMechanics.core_mechanics,
      game_structure: gameStructure.structure,
      player_interaction: playerInteraction.interaction,
      art_direction: visualArt.art_direction,
      perspective: cameraPerspective.perspective,
      setting_period: setting.setting_period,
      mood_atmosphere: mood.mood_atmosphere,
      difficulty_approach: difficulty.difficulty_approach,
      time_commitment: timeCommitment.time_commitment,

      // Derived tags
      searchable_tags: searchableTags,

      // Confidence scores
      overall_confidence: overallConfidence,
      individual_confidences: individualConfidences,
    };
  }

  private buildGameContext(steamData: any): string {
    const name = steamData.name || "";
    const description =
      steamData.short_description || steamData.detailed_description || "";
    const genres =
      steamData.genres?.map((g: any) => g.description).join(", ") || "";
    const categories =
      steamData.categories?.map((c: any) => c.description).join(", ") || "";
    const developers = steamData.developers?.join(", ") || "";

    return `
Game: ${name}
Description: ${description.slice(0, 500)}
Steam Genres: ${genres}
Steam Categories: ${categories}  
Developer: ${developers}
`.trim();
  }

  private async getBasicInfo(context: string) {
    const result = await generateObject({
      model: this.model,
      schema: BasicInfoSchema,
      messages: [
        {
          role: "system",
          content:
            "You are a game analysis expert. Extract the game title and write compelling blurbs for discovery.",
        },
        {
          role: "user",
          content: `Extract basic info for this game:\n\n${context}`,
        },
      ],
    });
    return result.object;
  }

  private async getPrimaryClassification(context: string) {
    const result = await generateObject({
      model: this.model,
      schema: PrimaryClassificationSchema,
      messages: [
        {
          role: "system",
          content:
            "You are a game classification expert. Identify 1-3 primary genres that best describe this game. Focus on the core gameplay experience, not secondary features.",
        },
        {
          role: "user",
          content: `Classify the primary genres for this game:\n\n${context}`,
        },
      ],
    });
    return result.object;
  }

  private async getGameplayMechanics(context: string) {
    const result = await generateObject({
      model: this.model,
      schema: GameplayMechanicsSchema,
      messages: [
        {
          role: "system",
          content:
            "Analyze the core gameplay mechanics. Focus on what players actually do in the game - the primary activities and systems.",
        },
        {
          role: "user",
          content: `Identify the core gameplay mechanics:\n\n${context}`,
        },
      ],
    });
    return result.object;
  }

  private async getGameStructure(context: string) {
    const result = await generateObject({
      model: this.model,
      schema: GameStructureSchema,
      messages: [
        {
          role: "system",
          content:
            "Analyze how the game content is structured and organized. How do players progress through the game?",
        },
        {
          role: "user",
          content: `Classify the game structure:\n\n${context}`,
        },
      ],
    });
    return result.object;
  }

  private async getPlayerInteraction(context: string) {
    const result = await generateObject({
      model: this.model,
      schema: PlayerInteractionSchema,
      messages: [
        {
          role: "system",
          content:
            "Analyze how players interact with the game and each other. Focus on the multiplayer/singleplayer aspects.",
        },
        {
          role: "user",
          content: `Classify the player interaction:\n\n${context}`,
        },
      ],
    });
    return result.object;
  }

  private async getVisualArt(context: string) {
    const result = await generateObject({
      model: this.model,
      schema: VisualArtSchema,
      messages: [
        {
          role: "system",
          content:
            "Analyze the visual art direction and style. Focus on the overall aesthetic approach.",
        },
        {
          role: "user",
          content: `Classify the visual art direction:\n\n${context}`,
        },
      ],
    });
    return result.object;
  }

  private async getCameraPerspective(context: string) {
    const result = await generateObject({
      model: this.model,
      schema: CameraPerspectiveSchema,
      messages: [
        {
          role: "system",
          content:
            "Analyze the camera perspective used in the game. How does the player view the game world?",
        },
        {
          role: "user",
          content: `Classify the camera perspective:\n\n${context}`,
        },
      ],
    });
    return result.object;
  }

  private async getSetting(context: string) {
    const result = await generateObject({
      model: this.model,
      schema: SettingSchema,
      messages: [
        {
          role: "system",
          content:
            "Analyze the setting and time period of the game world. What kind of world does the game take place in?",
        },
        {
          role: "user",
          content: `Classify the setting:\n\n${context}`,
        },
      ],
    });
    return result.object;
  }

  private async getMood(context: string) {
    const result = await generateObject({
      model: this.model,
      schema: MoodSchema,
      messages: [
        {
          role: "system",
          content:
            "Analyze the mood and atmosphere of the game. What emotional tone does it create?",
        },
        {
          role: "user",
          content: `Classify the mood and atmosphere:\n\n${context}`,
        },
      ],
    });
    return result.object;
  }

  private async getDifficulty(context: string) {
    const result = await generateObject({
      model: this.model,
      schema: DifficultySchema,
      messages: [
        {
          role: "system",
          content:
            "Analyze the difficulty approach and challenge level. How does the game challenge players?",
        },
        {
          role: "user",
          content: `Classify the difficulty approach:\n\n${context}`,
        },
      ],
    });
    return result.object;
  }

  private async getTimeCommitment(context: string) {
    const result = await generateObject({
      model: this.model,
      schema: TimeCommitmentSchema,
      messages: [
        {
          role: "system",
          content:
            "Analyze the expected time commitment for players. How long are typical play sessions?",
        },
        {
          role: "user",
          content: `Classify the time commitment:\n\n${context}`,
        },
      ],
    });
    return result.object;
  }

  private generateSearchableTags(classifications: any): string[] {
    const tags = new Set<string>();

    // Add primary genres
    classifications.primaryClassification.primary_genres.forEach(
      (genre: string) => tags.add(genre.toLowerCase())
    );

    // Add core mechanics
    classifications.gameplayMechanics.core_mechanics.forEach(
      (mechanic: string) => tags.add(mechanic)
    );

    // Add structure
    tags.add(classifications.gameStructure.structure);

    // Add player interaction
    tags.add(classifications.playerInteraction.interaction);

    // Add visual elements
    tags.add(classifications.visualArt.art_direction);
    tags.add(classifications.cameraPerspective.perspective);

    // Add thematic elements
    tags.add(classifications.setting.setting_period);
    tags.add(classifications.mood.mood_atmosphere);

    // Add experience elements
    tags.add(classifications.difficulty.difficulty_approach);
    tags.add(classifications.timeCommitment.time_commitment);

    // Add some combination tags
    tags.add(
      `${classifications.visualArt.art_direction}_${classifications.cameraPerspective.perspective}`
    );
    tags.add(
      `${classifications.setting.setting_period}_${classifications.mood.mood_atmosphere}`
    );

    // Convert to array and limit to 25 tags
    return Array.from(tags).slice(0, 25);
  }
}
