# New Modular Search System

This directory contains the new modular search architecture that replaces the monolithic search implementation.

## Architecture Overview

```
search/
├── types.ts              # Type definitions
├── intent-classifier.ts  # AI-powered intent classification
├── cache.ts              # Unified caching layer
├── data-loader.ts        # Data loading with caching
├── orchestrator.ts       # Main search orchestrator
├── strategies/           # Search strategy implementations
│   ├── base-strategy.ts
│   ├── semantic-strategy.ts
│   ├── similar-strategy.ts
│   ├── genre-strategy.ts
│   ├── feature-strategy.ts
│   ├── hybrid-strategy.ts
│   └── index.ts
└── index.ts              # Public API with backward compatibility
```

## Key Improvements

### 1. **Intent Classification**

- AI-powered classification of user search intent
- Supports: semantic, similar, genre, mood, feature, hybrid
- Fallback to regex-based classification
- Caching for performance

### 2. **Strategy Pattern**

- Modular search strategies for different intent types
- Easy to add new strategies
- Strategies can be combined for hybrid searches
- Proper separation of concerns

### 3. **Unified Caching**

- Single cache implementation with TTL
- Automatic cleanup of expired items
- Strategy-specific cache durations
- Memory efficient

### 4. **Better Error Handling**

- Graceful degradation on failures
- Proper error responses
- Fallback strategies

### 5. **Performance Optimizations**

- Parallel strategy execution for hybrid searches
- Smart caching based on intent confidence
- Reduced memory usage
- Better deduplication

## Usage

### Basic Usage (Backward Compatible)

```typescript
import { searchGames, getAllGames } from "@/lib/search";

// Same API as before
const games = await searchGames("roguelike games");
const allGames = await getAllGames();
```

### Advanced Usage

```typescript
import { searchWithMetadata, SearchOrchestrator } from "@/lib/search";

// Get full response with metadata
const response = await searchWithMetadata("games like Celeste", userId);
console.log(response.metadata.intent); // Intent classification details
console.log(response.metadata.strategy); // Which strategy was used

// Direct orchestrator usage
const orchestrator = SearchOrchestrator.getInstance();
const response = await orchestrator.search("co-op puzzle games");
```

## Migration Guide

### For API Routes

Replace imports:

```typescript
// Old
import { searchGames, getAllGames } from "@/lib/search";

// New (same functions, better implementation)
import { searchGames, getAllGames } from "@/lib/search";
```

### For Advanced Features

```typescript
// Get search metadata
import { searchWithMetadata } from "@/lib/search";

const response = await searchWithMetadata(query, userId);
// Access: response.metadata.intent, response.metadata.strategy, etc.
```

## Intent Types

1. **Semantic**: General descriptive searches
2. **Similar**: "games like X" queries
3. **Genre**: Genre-specific searches
4. **Mood**: Mood-based searches ("relaxing games")
5. **Feature**: Feature-specific searches ("co-op games")
6. **Hybrid**: Combines multiple intent types

## Adding New Strategies

1. Extend `BaseSearchStrategy`
2. Implement `canHandle()` and `execute()` methods
3. Add to strategies array in `orchestrator.ts`
4. Export from `strategies/index.ts`

Example:

```typescript
export class CustomStrategy extends BaseSearchStrategy {
  name = "custom-strategy";

  canHandle(intent: SearchIntent): boolean {
    return intent.type === "custom";
  }

  async execute(context: SearchContext): Promise<GameData[]> {
    // Implementation
  }
}
```
