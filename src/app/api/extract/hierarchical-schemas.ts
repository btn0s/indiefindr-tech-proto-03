import { z } from "zod";

// Step 1: Primary classification with manageable enum size (12 options max)
export const PrimaryClassificationSchema = z.object({
  primary_genres: z.array(z.enum([
    'Action',
    'RPG', 
    'Strategy',
    'Simulation',
    'Adventure',
    'Puzzle',
    'Sports',
    'Racing',
    'Horror',
    'Platformer',
    'Shooter',
    'Indie'
  ])).max(3).describe("1-3 primary genre classifications"),
  confidence: z.number().min(0).max(1).describe("Overall classification confidence")
});

// Step 2: Gameplay mechanics facet (13 options)
export const GameplayMechanicsSchema = z.object({
  core_mechanics: z.array(z.enum([
    'combat', 'exploration', 'puzzle_solving', 'building', 'crafting',
    'survival', 'stealth', 'racing', 'rhythm', 'management',
    'resource_collection', 'tower_defense', 'deck_building'
  ])).max(5).describe("Core gameplay mechanics"),
  confidence: z.number().min(0).max(1)
});

// Step 3: Game structure facet (9 options)
export const GameStructureSchema = z.object({
  structure: z.enum([
    'linear', 'open_world', 'hub_world', 'level_based', 'procedural',
    'sandbox', 'mission_based', 'run_based', 'persistent_world'
  ]).describe("How game content is structured"),
  confidence: z.number().min(0).max(1)
});

// Step 4: Player interaction facet (7 options)
export const PlayerInteractionSchema = z.object({
  interaction: z.enum([
    'singleplayer', 'local_coop', 'online_multiplayer', 'competitive',
    'mmo', 'asymmetric', 'party_game'
  ]).describe("How players interact with the game"),
  confidence: z.number().min(0).max(1)
});

// Step 5: Visual art direction facet (9 options)
export const VisualArtSchema = z.object({
  art_direction: z.enum([
    'realistic', 'stylized', 'cartoon', 'anime', 'minimalist',
    'pixel_art', 'low_poly', 'hand_drawn', 'photorealistic'
  ]).describe("Overall visual art direction"),
  confidence: z.number().min(0).max(1)
});

// Step 6: Camera perspective facet (8 options)
export const CameraPerspectiveSchema = z.object({
  perspective: z.enum([
    'first_person', 'third_person', 'top_down', 'side_scrolling',
    'isometric', 'fixed_camera', '2d', '2_5d'
  ]).describe("Camera perspective"),
  confidence: z.number().min(0).max(1)
});

// Step 7: Setting/time period facet (9 options)
export const SettingSchema = z.object({
  setting_period: z.enum([
    'modern', 'historical', 'futuristic', 'fantasy', 'sci_fi',
    'post_apocalyptic', 'medieval', 'prehistoric', 'abstract'
  ]).describe("Time period or setting type"),
  confidence: z.number().min(0).max(1)
});

// Step 8: Mood/atmosphere facet (10 options)
export const MoodSchema = z.object({
  mood_atmosphere: z.enum([
    'lighthearted', 'serious', 'dark', 'comedic', 'mysterious',
    'tense', 'relaxing', 'epic', 'intimate', 'surreal'
  ]).describe("Overall mood and atmosphere"),
  confidence: z.number().min(0).max(1)
});

// Step 9: Difficulty approach facet (8 options)
export const DifficultySchema = z.object({
  difficulty_approach: z.enum([
    'easy', 'moderate', 'challenging', 'punishing', 'adaptive',
    'skill_based', 'knowledge_based', 'accessibility_focused'
  ]).describe("Difficulty and challenge approach"),
  confidence: z.number().min(0).max(1)
});

// Step 10: Time commitment facet (6 options)
export const TimeCommitmentSchema = z.object({
  time_commitment: z.enum([
    'quick_sessions', 'medium_sessions', 'long_sessions', 'variable',
    'endless', 'campaign_based'
  ]).describe("Typical time commitment expected"),
  confidence: z.number().min(0).max(1)
});

// Basic info schemas (unchanged from original)
export const BasicInfoSchema = z.object({
  title: z.string().describe("Clean, readable game title"),
  blurb_140: z.string().describe("Compelling short description for discovery (aim for ~140 chars)"),
  blurb_400: z.string().describe("Detailed description highlighting key features and appeal (aim for ~400 chars)")
});

// Combined result schema
export const HierarchicalClassificationResult = z.object({
  // Basic info
  title: z.string(),
  blurb_140: z.string(),
  blurb_400: z.string(),
  
  // Hierarchical classifications
  primary_genres: z.array(z.string()),
  core_mechanics: z.array(z.string()),
  game_structure: z.string(),
  player_interaction: z.string(),
  art_direction: z.string(),
  perspective: z.string(),
  setting_period: z.string(),
  mood_atmosphere: z.string(),
  difficulty_approach: z.string(),
  time_commitment: z.string(),
  
  // Derived tags
  searchable_tags: z.array(z.string()).max(25),
  
  // Confidence scores
  overall_confidence: z.number().min(0).max(1),
  individual_confidences: z.record(z.number().min(0).max(1))
});
