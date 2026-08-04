/**
 * Asset path resolution for Artist Bible.
 * Public URLs map to /public/assets/* — logical structure lives in src/assets docs.
 */
import type { DemoArtistEntry, ArtistImagePose, ArtistMerchItem } from "@/data/demo/artists/types";

const PUBLIC_BASE = "/assets";

export const ASSET_DIRS = {
  artists: `${PUBLIC_BASE}/artists`,
  logos: `${PUBLIC_BASE}/logos`,
  albums: `${PUBLIC_BASE}/albums`,
  tours: `${PUBLIC_BASE}/tours`,
  merch: `${PUBLIC_BASE}/merch`,
  backgrounds: `${PUBLIC_BASE}/backgrounds`,
} as const;

/** Shared genre pose pool (until per-artist PNGs are generated) */
const POSE_POOL: Record<string, Partial<Record<ArtistImagePose, string>>> = {
  "male-pop": { hero: "/demo/performers/male-pop-mic.png", transparent: "/demo/performers/male-pop-mic.png", performance: "/demo/performers/male-pop-arms-up.png", walk: "/demo/performers/male-pop-walk.png", crowd: "/demo/performers/male-pop-over-audience.png", mic: "/demo/performers/male-pop-mic.png" },
  "female-pop": { hero: "/demo/performers/female-pop-mic.png", transparent: "/demo/performers/female-pop-mic.png", performance: "/demo/performers/female-pop-mic.png", walk: "/demo/performers/female-pop-point.png", crowd: "/demo/performers/female-pop-point.png", closeUp: "/demo/performers/female-pop-closeup.png", profile: "/demo/performers/female-pop-closeup.png", back: "/demo/performers/female-pop-back.png", mic: "/demo/performers/female-pop-mic.png" },
  "rock-band": { hero: "/demo/performers/rock-mic.png", transparent: "/demo/performers/rock-mic.png", performance: "/demo/performers/rock-guitar.png", instrument: "/demo/performers/rock-guitar.png", walk: "/demo/performers/rock-full-body.png", profile: "/demo/performers/rock-profile.png", mic: "/demo/performers/rock-mic.png" },
  country: { hero: "/demo/performers/country-mic.png", transparent: "/demo/performers/country-mic.png", performance: "/demo/performers/country-guitar.png", instrument: "/demo/performers/country-guitar.png", mic: "/demo/performers/country-mic.png" },
  "hip-hop": { hero: "/demo/performers/hiphop-mic.png", transparent: "/demo/performers/hiphop-mic.png", performance: "/demo/performers/hiphop-point.png", crowd: "/demo/performers/hiphop-point.png", mic: "/demo/performers/hiphop-mic.png" },
  dj: { hero: "/demo/performers/dj-table.png", transparent: "/demo/performers/dj-table.png", performance: "/demo/performers/dj-arms-up.png", instrument: "/demo/performers/dj-table.png", mic: "/demo/performers/dj-table.png" },
  indie: { hero: "/demo/performers/indie-mic.png", transparent: "/demo/performers/indie-mic.png", performance: "/demo/performers/indie-guitar.png", instrument: "/demo/performers/indie-guitar.png", mic: "/demo/performers/indie-mic.png" },
  acoustic: { hero: "/demo/performers/acoustic-mic.png", transparent: "/demo/performers/acoustic-mic.png", performance: "/demo/performers/acoustic-piano.png", instrument: "/demo/performers/acoustic-piano.png", mic: "/demo/performers/acoustic-mic.png" },
  metal: { hero: "/demo/performers/metal-mic.png", transparent: "/demo/performers/metal-mic.png", performance: "/demo/performers/metal-mic.png", instrument: "/demo/performers/metal-bass.png", mic: "/demo/performers/metal-mic.png" },
  rnb: { hero: "/demo/performers/rnb-mic.png", transparent: "/demo/performers/rnb-mic.png", performance: "/demo/performers/rnb-mic.png", profile: "/demo/performers/rnb-profile.png", closeUp: "/demo/performers/rnb-profile.png", mic: "/demo/performers/rnb-mic.png" },
};

function artistAsset(id: string, file: string) {
  return `${ASSET_DIRS.artists}/${id}/${file}`;
}

export function buildArtistImages(id: string, poseCategory: string): DemoArtistEntry["images"] {
  const pool = POSE_POOL[poseCategory] ?? POSE_POOL["female-pop"]!;
  const dedicated = (pose: ArtistImagePose) => artistAsset(id, `${pose}.png`);
  const fallback = (pose: ArtistImagePose) => pool[pose] ?? pool.hero ?? pool.transparent ?? "/demo/performers/male-pop-mic.png";

  const poses: Partial<Record<ArtistImagePose, string>> = {};
  (["hero", "portrait", "transparent", "performance", "walk", "crowd", "closeUp", "profile", "back", "instrument", "mic", "promo", "vip", "arenaBanner"] as ArtistImagePose[]).forEach((p) => {
    poses[p] = fallback(p);
  });

  return {
    heroImage: fallback("hero"),
    portraitImage: fallback("portrait") ?? fallback("closeUp") ?? fallback("hero"),
    transparentPNG: fallback("transparent"),
    tourPoster: `${ASSET_DIRS.tours}/${id}-poster.png`,
    albumCover: `${ASSET_DIRS.albums}/${id}.png`,
    arenaBanner: `${ASSET_DIRS.backgrounds}/${id}-arena.png`,
    vipImage: fallback("vip") ?? fallback("hero"),
    poses,
  };
}

export function buildArtistBrand(
  id: string,
  primary: string,
  secondary: string,
  accent: string,
  gradient: string,
  description: string,
): DemoArtistEntry["brand"] {
  return {
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: accent,
    gradientClass: gradient,
    typography: "Space Grotesk",
    logoPath: `${ASSET_DIRS.logos}/${id}.png`,
    brandIconPath: `${ASSET_DIRS.logos}/${id}-icon.png`,
    brandDescription: description,
    brandVoice: "Confident, arena-ready, fan-first",
  };
}

export function resolvePoseImage(artist: DemoArtistEntry, pose: ArtistImagePose = "performance"): string {
  return artist.images.poses[pose] ?? artist.images.transparentPNG ?? artist.images.heroImage;
}

export function getArtistLogo(artist: DemoArtistEntry): string {
  return artist.brand.logoPath;
}

export function getArtistImages(artist: DemoArtistEntry): DemoArtistEntry["images"] {
  return artist.images;
}

export function getArtistBrand(artist: DemoArtistEntry): DemoArtistEntry["brand"] {
  return artist.brand;
}

export function getMerchImage(artistId: string, item: ArtistMerchItem): string {
  return item.imagePath || `${ASSET_DIRS.merch}/${artistId}/${item.id}.png`;
}

export function getAvailablePoses(artist: DemoArtistEntry): ArtistImagePose[] {
  return Object.keys(artist.images.poses) as ArtistImagePose[];
}
