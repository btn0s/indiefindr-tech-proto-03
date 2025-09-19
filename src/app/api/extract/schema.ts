import { z } from "zod";

// Core game mechanics and systems
const GameplayMechanicEnum = z.enum([
  "crafting",
  "building",
  "survival",
  "exploration",
  "combat",
  "stealth",
  "puzzle_solving",
  "resource_management",
  "base_building",
  "tower_defense",
  "deck_building",
  "card_battler",
  "turn_based_tactics",
  "real_time_strategy",
  "city_building",
  "simulation",
  "racing",
  "rhythm",
  "platforming",
  "metroidvania",
  "roguelike",
  "roguelite",
  "souls_like",
  "battle_royale",
  "auto_battler",
  "idle_clicker",
  "match_three",
  "hidden_object",
  "point_and_click",
  "visual_novel",
  "dating_sim",
  "life_sim",
  "farming_sim",
  "management",
  "tycoon",
  "grand_strategy",
  "4x_strategy",
]);

// Specific game formats and subgenres
const GameFormatEnum = z.enum([
  "arena_shooter",
  "hero_shooter",
  "tactical_shooter",
  "boomer_shooter",
  "extraction_shooter",
  "looter_shooter",
  "bullet_hell",
  "twin_stick_shooter",
  "rail_shooter",
  "light_gun",
  "mmorpg",
  "action_rpg",
  "jrpg",
  "crpg",
  "dungeon_crawler",
  "hack_and_slash",
  "beat_em_up",
  "fighting_game",
  "platform_fighter",
  "traditional_fighter",
  "tag_fighter",
  "weapon_fighter",
  "moba",
  "rts",
  "grand_strategy",
  "turn_based_strategy",
  "tower_defense",
  "auto_chess",
  "city_builder",
  "colony_sim",
  "god_game",
  "racing_sim",
  "arcade_racer",
  "kart_racer",
  "rally",
  "formula",
  "street_racing",
  "open_world_racer",
  "rhythm_game",
  "music_game",
  "dance_game",
  "puzzle_platformer",
  "physics_puzzle",
  "logic_puzzle",
  "word_game",
  "trivia",
  "party_game",
  "social_deduction",
  "asymmetric_multiplayer",
  "walking_simulator",
  "narrative_adventure",
  "interactive_fiction",
  "immersive_sim",
  "sandbox",
  "creative",
  "educational",
  "fitness",
  "virtual_pet",
  "gacha",
  "match_three",
  "endless_runner",
  "hyper_casual",
]);

const CameraEnum = z.enum([
  "first_person",
  "third_person",
  "top_down",
  "isometric",
  "side_scroller",
  "fixed_camera",
  "cinematic_camera",
  "over_shoulder",
  "bird_eye",
  "2d_side_view",
  "2_5d",
  "vr_360",
  "bodycam",
  "drone_view",
]);

const ModeEnum = z.enum([
  "singleplayer",
  "local_coop",
  "online_coop",
  "local_versus",
  "online_pvp",
  "competitive",
  "casual_multiplayer",
  "mmo",
  "battle_royale",
  "team_vs_team",
  "free_for_all",
  "asymmetric",
  "cross_platform",
  "split_screen",
  "hot_seat",
]);

const StructureEnum = z.enum([
  "linear",
  "semi_linear",
  "hub_world",
  "open_world",
  "sandbox",
  "procedural",
  "level_based",
  "mission_based",
  "chapter_based",
  "episodic",
  "run_based",
  "session_based",
  "persistent_world",
  "seasonal_content",
  "live_service",
  "story_driven",
  "arcade_mode",
  "campaign",
  "endless",
  "time_attack",
]);

const SettingEnum = z.enum([
  "modern_day",
  "near_future",
  "far_future",
  "cyberpunk",
  "steampunk",
  "dieselpunk",
  "post_apocalyptic",
  "dystopian",
  "utopian",
  "medieval",
  "fantasy",
  "dark_fantasy",
  "urban_fantasy",
  "sci_fi",
  "space_opera",
  "western",
  "noir",
  "horror",
  "supernatural",
  "mythology",
  "historical",
  "alternate_history",
  "prehistoric",
  "ancient",
  "victorian",
  "wwi",
  "wwii",
  "cold_war",
  "contemporary",
  "abstract",
  "surreal",
  "cartoon",
  "anime",
  "realistic",
  "stylized",
  "pixel_art",
  "voxel",
  "low_poly",
  "photorealistic",
]);

const ThemeEnum = z.enum([
  "adventure",
  "mystery",
  "horror",
  "comedy",
  "drama",
  "romance",
  "thriller",
  "action",
  "war",
  "peace",
  "survival",
  "exploration",
  "discovery",
  "coming_of_age",
  "revenge",
  "redemption",
  "sacrifice",
  "friendship",
  "betrayal",
  "power",
  "corruption",
  "justice",
  "freedom",
  "oppression",
  "family",
  "loss",
  "hope",
  "despair",
  "identity",
  "transformation",
  "technology",
  "nature",
  "civilization",
  "isolation",
  "community",
  "competition",
  "cooperation",
  "conflict",
  "harmony",
  "chaos",
  "order",
]);

const DifficultyEnum = z.enum([
  "very_easy",
  "easy",
  "normal",
  "hard",
  "very_hard",
  "brutal",
  "adaptive",
  "customizable",
  "accessibility_focused",
  "skill_based",
  "knowledge_based",
  "reaction_based",
  "strategic",
  "casual_friendly",
]);

const ArtStyleEnum = z.enum([
  // Realism spectrum
  "photorealistic",
  "realistic",
  "semi_realistic",
  "stylized",
  "cartoon",
  "anime",

  // Pixel art variations
  "pixel_art",
  "8_bit",
  "16_bit",
  "32_bit",
  "modern_pixel",
  "hd_pixel",

  // Low-fi aesthetics
  "lofi",
  "psx",
  "ps1_style",
  "n64_style",
  "dreamcast_style",
  "retro_3d",
  "early_3d",
  "chunky_3d",
  "low_res_textures",
  "crt_filter",

  // 3D styles
  "low_poly",
  "high_poly",
  "voxel",
  "polygonal",
  "geometric",
  "faceted",

  // Hand-crafted
  "hand_drawn",
  "hand_painted",
  "watercolor",
  "oil_painting",
  "sketch",
  "pencil_art",
  "ink_art",
  "charcoal",
  "pastel",

  // Rendering techniques
  "cel_shaded",
  "toon_shaded",
  "flat_shaded",
  "wireframe",
  "silhouette",
  "outline_heavy",
  "no_outlines",
  "thick_lines",
  "thin_lines",

  // Visual complexity
  "minimalist",
  "detailed",
  "cluttered",
  "clean",
  "busy",
  "sparse",

  // Color palettes
  "monochrome",
  "grayscale",
  "black_white",
  "sepia",
  "limited_palette",
  "vibrant",
  "muted",
  "pastel_colors",
  "neon",
  "saturated",
  "desaturated",

  // Lighting styles
  "flat_lighting",
  "dramatic_lighting",
  "soft_lighting",
  "harsh_lighting",
  "rim_lighting",
  "volumetric",
  "god_rays",
  "ambient_only",

  // Texture styles
  "smooth_textures",
  "rough_textures",
  "painterly",
  "procedural_textures",
  "photo_textures",
  "stylized_textures",
  "flat_textures",

  // Movement/animation
  "fluid_animation",
  "choppy_animation",
  "tweened",
  "frame_by_frame",
  "motion_blur",
  "no_motion_blur",

  // Era-specific
  "retro",
  "vintage",
  "modern",
  "futuristic",
  "timeless",
  "dated",
  "90s_aesthetic",
  "2000s_aesthetic",
  "arcade_style",
  "console_style",

  // Artistic movements
  "impressionist",
  "expressionist",
  "surreal",
  "abstract",
  "cubist",
  "art_deco",
  "art_nouveau",
  "bauhaus",
  "pop_art",

  // Genre-specific
  "gothic",
  "steampunk",
  "cyberpunk",
  "dieselpunk",
  "solarpunk",
  "fantasy",
  "sci_fi",
  "horror",
  "noir",
  "western",
  "medieval",
]);

const AudioStyleEnum = z.enum([
  "orchestral",
  "electronic",
  "rock",
  "metal",
  "ambient",
  "chiptune",
  "jazz",
  "classical",
  "folk",
  "world",
  "industrial",
  "synthwave",
  "lo_fi",
  "atmospheric",
  "dynamic",
  "adaptive",
  "procedural",
  "licensed_music",
]);

const MaturityEnum = z.enum([
  "everyone",
  "everyone_10",
  "teen",
  "mature_17",
  "adults_18",
]);

const ContentFlagEnum = z.enum([
  "mild_violence",
  "intense_violence",
  "blood",
  "gore",
  "graphic_violence",
  "suggestive_themes",
  "partial_nudity",
  "nudity",
  "sexual_themes",
  "sexual_content",
  "mild_language",
  "strong_language",
  "crude_humor",
  "mature_humor",
  "drug_reference",
  "alcohol_use",
  "tobacco_use",
  "gambling",
  "simulated_gambling",
  "scary_themes",
  "horror_themes",
  "flashing_lights",
  "photosensitive_epilepsy",
  "online_interactions",
  "user_generated_content",
  "in_app_purchases",
  "loot_boxes",
]);

const PlatformEnum = z.enum([
  "windows",
  "mac",
  "linux",
  "steam_deck",
  "playstation_4",
  "playstation_5",
  "xbox_one",
  "xbox_series",
  "nintendo_switch",
  "ios",
  "android",
  "web_browser",
  "vr_headset",
  "mobile",
  "console",
  "pc",
  "handheld",
]);

const AccessibilityEnum = z.enum([
  "colorblind_support",
  "subtitle_support",
  "audio_cues",
  "visual_cues",
  "difficulty_options",
  "control_remapping",
  "text_scaling",
  "ui_scaling",
  "motor_accessibility",
  "cognitive_accessibility",
  "hearing_impaired",
  "vision_impaired",
  "one_handed_controls",
  "pause_anywhere",
]);

// Separate focused schemas for cleaner extraction
export const BasicInfoSchema = z.object({
  title: z.string().describe("Clean, readable game title"),
  blurb_140: z
    .string()
    .optional()
    .describe(
      "Compelling short description for discovery (aim for ~140 chars)"
    ),
  blurb_400: z
    .string()
    .optional()
    .describe(
      "Detailed description highlighting key features and appeal (aim for ~400 chars)"
    ),
});

export const GameplaySchema = z.object({
  gameplay_mechanics: z
    .array(GameplayMechanicEnum)
    .optional()
    .describe(
      "Core game mechanics and systems (e.g. crafting, combat, survival, puzzle-solving)"
    ),
  game_formats: z
    .array(GameFormatEnum)
    .optional()
    .describe(
      "Specific game subgenres and formats (e.g. arena_shooter, roguelike, mmorpg, battle_royale)"
    ),
  camera: z
    .array(CameraEnum)
    .optional()
    .describe("Camera perspective(s) used in the game"),
  modes: z
    .array(ModeEnum)
    .optional()
    .describe("Available play modes (single/multiplayer options)"),
  structure: z
    .array(StructureEnum)
    .optional()
    .describe("How game content is organized and presented to players"),
});

export const WorldNarrativeSchema = z.object({
  setting: z
    .array(SettingEnum)
    .optional()
    .describe(
      "Time period, world type, and environmental setting (e.g. medieval, sci_fi, cyberpunk, post_apocalyptic)"
    ),
  themes: z
    .array(ThemeEnum)
    .optional()
    .describe(
      "Narrative and emotional themes explored in the game (e.g. survival, mystery, friendship, revenge)"
    ),
});

export const AestheticsSchema = z.object({
  art_style: z
    .array(ArtStyleEnum)
    .optional()
    .describe(
      "Visual art style and aesthetic choices (e.g. pixel_art, psx, lofi, realistic, cel_shaded, low_poly)"
    ),
  audio_style: z
    .array(AudioStyleEnum)
    .optional()
    .describe(
      "Music and audio style characteristics (e.g. chiptune, orchestral, electronic, ambient)"
    ),
});

export const ExperienceSchema = z
  .object({
    difficulty: z
      .array(DifficultyEnum)
      .optional()
      .describe("Challenge level and difficulty characteristics of the game"),
    estimated_playtime: z
      .enum([
        "under_1h",
        "1_3h",
        "3_8h",
        "8_20h",
        "20_50h",
        "50_100h",
        "100h_plus",
        "endless",
      ])
      .optional()
      .describe(
        "Estimated time to complete main content or typical play session"
      ),
    complexity_level: z
      .enum(["simple", "moderate", "complex", "very_complex"])
      .optional()
      .describe("Overall game complexity in terms of systems and mechanics"),
    learning_curve: z
      .enum(["easy", "moderate", "steep", "very_steep"])
      .optional()
      .describe(
        "How difficult it is for new players to learn and understand the game"
      ),
    replayability: z
      .enum(["low", "moderate", "high", "infinite"])
      .optional()
      .describe("How much replay value the game offers"),
  })
  .strict();

export const ContentRatingSchema = z.object({
  maturity: MaturityEnum.optional().describe(
    "Age rating/maturity level for the game content"
  ),
  content_flags: z
    .array(ContentFlagEnum)
    .optional()
    .describe(
      "Specific content warnings and flags (be granular: mild_violence vs graphic_violence)"
    ),
});

export const TagsSchema = z.object({
  tag_names: z
    .array(z.string())
    .optional()
    .describe(
      "Comprehensive searchable tags covering genre, mechanics, visual style, setting, mood, and notable features"
    ),
});

export const CombinedSchema = z.object({
  basicInfo: BasicInfoSchema,
  gameplay: GameplaySchema,
  worldNarrative: WorldNarrativeSchema,
  aesthetics: AestheticsSchema,
  experience: ExperienceSchema,
  contentRating: ContentRatingSchema,
  tags: TagsSchema,
});
