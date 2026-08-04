import rosterData from "@/data/demo/artists/roster.json";
import { validateRoster } from "@/data/demo/artists/schema";
import type { DemoArtistEntry } from "@/data/demo/artists/types";

const validated = validateRoster(rosterData);

/** Immutable demo-only artist registry — 120 fictional performers */
export const DEMO_ARTISTS: readonly DemoArtistEntry[] = Object.freeze(validated.artists as DemoArtistEntry[]);

export const DEMO_ARTISTS_BY_ID: ReadonlyMap<string, DemoArtistEntry> = new Map(
  DEMO_ARTISTS.map((a) => [a.id, a]),
);

export const DEMO_ARTISTS_VERSION = validated.version;
