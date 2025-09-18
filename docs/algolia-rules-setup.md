# Algolia Rules Setup for Indiefindr

## Gaming-Specific Query Rules

### 1. Genre Mapping Rules

```
Condition: Query contains "cozy"
Action: Replace with "casual relaxing peaceful"

Condition: Query contains "challenging"
Action: Replace with "difficult hard hardcore"

Condition: Query contains "story-driven"
Action: Replace with "narrative story plot"
```

### 2. Art Style Rules

```
Condition: Query contains "pixel art" OR "8-bit" OR "retro"
Action: Auto-filter art_style facet = "pixel"

Condition: Query contains "hand-drawn" OR "cartoon"
Action: Auto-filter art_style facet = "cartoon"
```

### 3. Gameplay Feature Rules

```
Condition: Query contains "multiplayer" OR "co-op" OR "online"
Action: Auto-filter features facet = "multiplayer"

Condition: Query contains "single player" OR "solo"
Action: Auto-filter features facet = "singleplayer"
```

### 4. Price-based Rules

```
Condition: Query contains "free" OR "no cost"
Action: Auto-filter price_range facet = "free"

Condition: Query contains "cheap" OR "budget" OR "under $10"
Action: Auto-filter price_range facet = "budget"
```

### 5. Mood/Vibe Rules

```
Condition: Query contains "atmospheric"
Action: Boost tags containing "atmosphere", "ambient", "immersive"

Condition: Query contains "addictive" OR "time sink"
Action: Boost tags containing "replayable", "endless", "progression"
```

## Implementation Steps

1. Go to Algolia Dashboard → Your Index → Rules
2. Create rules using Visual Editor
3. Test with common gaming queries
4. Monitor analytics to see which queries aren't working well
5. Iterate and add more rules based on user behavior
