import { GameCard } from "./game-card";

interface Game {
  appId: string;
  title: string;
  description: string;
  price: string;
  tags: string[];
  releaseDate: string;
  developer: string;
  publisher: string;
  images: string[];
  tweetId: string;
  tweetAuthor: string;
  tweetText?: string;
  tweetUrl?: string;
  aiMetadata?: {
    summary: string;
    gameTitles: string[];
    genres: string[];
    keyFeatures: string[];
    targetAudience: string;
    releaseStatus: string;
    // Enhanced fields for natural language search
    mood: string[];
    vibe: string[];
    atmosphere: string[];
    playStyle: string[];
    socialContext: string[];
    difficultyLevel: string;
    emotionalTone: string[];
    settingAesthetics: string[];
    gameplayFeel: string[];
    // First-principles game attributes
    playModes: string[];
    coreMechanics: string[];
    cameraPerspective: string[];
    artStyle: string[];
    visualStyle: string[];
    controlScheme: string[];
    sessionLength: string[];
    complexity: string;
    multiplayerFeatures: string[];
    contentRating: string;
    platformSupport: string[];
    languageSupport: string[];
    accessibility: string[];
    performance: string[];
  };
  similarity: number;
}

export const GameGrid = ({
  games,
  query,
}: {
  games: Game[];
  query?: string;
}) => {
  return (
    <div className="space-y-4">
      {query && (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">
            Search Results for "{query}"
          </h2>
          <p className="text-gray-600">
            Found {games.length} games matching your search
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {games.map((game) => (
          <GameCard key={`${game.appId}-${game.tweetId}`} game={game} />
        ))}
      </div>
    </div>
  );
};
