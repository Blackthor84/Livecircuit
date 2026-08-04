# LiveCircuit Demo Artists

**Demo-only fictional roster** — never import from production-facing pages.

## Location

```
src/data/demo/artists/
  artists/*.json     — 120 fictional performers
  roster.json        — validated catalog (environment: "demo")
  types.ts           — DemoArtistEntry
  queries.ts         — demo query API
```

## Identity fields (every demo artist)

```json
{
  "isDemoArtist": true,
  "visibility": "demo-only",
  "environment": "demo"
}
```

## Usage

```ts
// ✓ Demo routes and demo components only
import { getFeaturedArtists } from "@/data/demo/artists";

// ✗ Never on homepage, marketing, SEO, or public API
```

## Regenerate

```bash
npx tsx scripts/generate-artist-bible.ts
```

## Production artists

Real performers live in `src/data/production/artists/` — separate registry, no demo imports.

Shared types: `src/data/shared/artist-types.ts`
