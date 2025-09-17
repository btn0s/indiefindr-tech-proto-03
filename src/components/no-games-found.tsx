interface NoGamesFoundProps {
  query: string;
}

export const NoGamesFound = ({ query }: NoGamesFoundProps) => {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🎮</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No games found
      </h3>
      <p className="text-gray-600 mb-4">
        {query
          ? `No games match "${query}". Try searching for something else!`
          : "No games available. Run the pipeline to generate data!"}
      </p>
      <div className="text-sm text-gray-500">
        <p>Try searching for:</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <span className="bg-gray-100 px-3 py-1 rounded-full">
            puzzle games
          </span>
          <span className="bg-gray-100 px-3 py-1 rounded-full">
            cozy farming
          </span>
          <span className="bg-gray-100 px-3 py-1 rounded-full">roguelike</span>
          <span className="bg-gray-100 px-3 py-1 rounded-full">
            indie horror
          </span>
          <span className="bg-gray-100 px-3 py-1 rounded-full">platformer</span>
        </div>
      </div>
    </div>
  );
};
