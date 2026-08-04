/**
 * Generates individual demo artist JSON files + roster.json.
 * Run: npx tsx scripts/generate-artist-bible.ts
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { buildArtistBibleEntry, rosterSeedFromLegacy } from "../src/data/demo/artists/build-entry";
import { validateArtistEntry, validateRoster } from "../src/data/demo/artists/schema";
import { LIVECIRCUIT_ORIGINALS } from "../src/lib/demo/originals/roster-data";

const ROOT = join(process.cwd(), "src/data/demo/artists");
const ARTISTS_DIR = join(ROOT, "artists");

mkdirSync(ARTISTS_DIR, { recursive: true });

const artists = LIVECIRCUIT_ORIGINALS.map((legacy) => {
  const seed = rosterSeedFromLegacy({
    id: legacy.id,
    name: legacy.name,
    genre: legacy.genre,
    actType: legacy.actType,
    hometown: legacy.hometown,
    tagline: legacy.tagline,
    aesthetic: legacy.aesthetic,
    brand: legacy.brand,
    poseCategory: legacy.poseCategory,
    monthlyListeners: legacy.monthlyListeners,
    followers: legacy.followers,
    fanDemographic: legacy.fanDemographic,
    currentTour: legacy.currentTour,
    albumTitle: legacy.albumTitle,
    singleTitle: legacy.singleTitle,
    manager: legacy.manager,
    status: legacy.status,
    featured: legacy.featured,
    liveAudience: legacy.liveAudience,
    revenueTonight: legacy.revenueTonight,
    merchSalesTonight: legacy.merchSalesTonight,
    showsScheduled: legacy.showsScheduled,
    growthPct: legacy.growthPct,
  });
  const entry = buildArtistBibleEntry(seed);
  validateArtistEntry(entry);
  writeFileSync(join(ARTISTS_DIR, `${entry.id}.json`), JSON.stringify(entry, null, 2));
  return entry;
});

const roster = validateRoster({
  version: 1,
  generatedAt: new Date().toISOString(),
  environment: "demo",
  artists,
});

writeFileSync(join(ROOT, "roster.json"), JSON.stringify(roster, null, 2));
console.log(`Generated ${artists.length} demo artist JSON files + roster.json`);
