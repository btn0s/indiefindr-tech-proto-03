export interface SteamGame {
  type: string;
  name: string;
  steam_appid: number;
  required_age: number;
  is_free: boolean;
  controller_support: string;
  detailed_description: string;
  about_the_game: string;
  short_description: string;
  supported_languages: string;
  header_image: string;
  capsule_image: string;
  capsule_imagev5: string;
  website: string;
  pc_requirements: SteamRequirements;
  mac_requirements: SteamRequirements;
  linux_requirements: SteamRequirements;
  developers: string[];
  publishers: string[];
  price_overview: SteamPriceOverview;
  packages: number[];
  package_groups: SteamPackageGroup[];
  platforms: SteamPlatforms;
  categories: SteamCategory[];
  genres: SteamGenre[];
  screenshots: SteamScreenshot[];
  movies: SteamMovie[];
  recommendations: {
    total: number;
  };
  achievements: {
    total: number;
    highlighted: SteamAchievement[];
  };
  release_date: {
    coming_soon: boolean;
    date: string;
  };
  support_info: {
    url: string;
    email: string;
  };
  background: string;
  background_raw: string;
  content_descriptors: {
    ids: number[];
    notes: string;
  };
  ratings: {
    [region: string]: {
      rating_generated: string;
      rating: string;
      required_age: string;
      banned: string;
      use_age_gate: string;
      descriptors: string;
    };
  };
}

export interface SteamRequirements {
  minimum: string;
  recommended: string;
}

export interface SteamPriceOverview {
  currency: string;
  initial: number;
  final: number;
  discount_percent: number;
  initial_formatted: string;
  final_formatted: string;
}

export interface SteamPackageGroup {
  name: string;
  title: string;
  description: string;
  selection_text: string;
  save_text: string;
  display_type: number;
  is_recurring_subscription: string;
  subs: SteamSubPackage[];
}

export interface SteamSubPackage {
  packageid: number;
  percent_savings_text: string;
  percent_savings: number;
  option_text: string;
  option_description: string;
  can_get_free_license: string;
  is_free_license: boolean;
  price_in_cents_with_discount: number;
}

export interface SteamPlatforms {
  windows: boolean;
  mac: boolean;
  linux: boolean;
}

export interface SteamCategory {
  id: number | string;
  description: string;
}

export interface SteamGenre {
  id: string;
  description: string;
}

export interface SteamScreenshot {
  id: number;
  path_thumbnail: string;
  path_full: string;
}

export interface SteamMovie {
  id: number;
  name: string;
  thumbnail: string;
  webm: {
    [quality: string]: string;
  };
  mp4: {
    [quality: string]: string;
  };
  highlight: boolean;
}

export interface SteamAchievement {
  name: string;
  path: string;
}
