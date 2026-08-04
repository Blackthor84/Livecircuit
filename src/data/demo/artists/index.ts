/**
 * LiveCircuit Demo Artists — demo-only fictional roster.
 * NEVER import this module from production-facing pages.
 */
export * from "@/data/demo/artists/types";
export * from "@/data/demo/artists/constants";
export * from "@/data/demo/artists/assets";
export * from "@/data/demo/artists/queries";
export * from "@/data/demo/artists/derive";
export { DEMO_ARTISTS, DEMO_ARTISTS_BY_ID, DEMO_ARTISTS_VERSION } from "@/data/demo/artists/registry";

/** @deprecated Use DEMO_ARTISTS */
export { DEMO_ARTISTS as ARTIST_BIBLE } from "@/data/demo/artists/registry";
/** @deprecated Use DEMO_ARTISTS_BY_ID */
export { DEMO_ARTISTS_BY_ID as ARTIST_BIBLE_BY_ID } from "@/data/demo/artists/registry";
/** @deprecated Use DEMO_ARTISTS_VERSION */
export { DEMO_ARTISTS_VERSION as ARTIST_BIBLE_VERSION } from "@/data/demo/artists/registry";
