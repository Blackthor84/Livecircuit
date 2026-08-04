import type { OriginalsArtist, OriginalsPoseId } from "@/lib/demo/originals/types";

const PERFORMER_BASE = "/demo/performers";
const ORIGINALS_BASE = "/demo/originals";

/** Maps pose category to default shared PNG filename stem */
const CATEGORY_POSE_MAP: Record<string, Partial<Record<OriginalsPoseId, string>>> = {
  "male-pop": { hero: "male-pop-mic", mic: "male-pop-mic", "full-body": "male-pop-walk", walk: "male-pop-walk", perform: "male-pop-arms-up", crowd: "male-pop-over-audience", "close-up": "male-pop-mic", profile: "male-pop-walk", back: "male-pop-walk", instrument: "male-pop-mic", promo: "male-pop-arms-up" },
  "female-pop": { hero: "female-pop-mic", mic: "female-pop-mic", "full-body": "female-pop-point", walk: "female-pop-point", perform: "female-pop-mic", crowd: "female-pop-point", "close-up": "female-pop-closeup", profile: "female-pop-closeup", back: "female-pop-back", instrument: "female-pop-mic", promo: "female-pop-point" },
  "rock-band": { hero: "rock-mic", mic: "rock-mic", perform: "rock-guitar", instrument: "rock-guitar", "full-body": "rock-full-body", profile: "rock-profile", walk: "rock-full-body", crowd: "rock-mic", "close-up": "rock-profile", back: "rock-full-body", promo: "rock-mic" },
  country: { hero: "country-mic", mic: "country-mic", instrument: "country-guitar", perform: "country-guitar", walk: "country-mic", crowd: "country-mic", "full-body": "country-guitar", profile: "country-mic", back: "country-mic", promo: "country-guitar" },
  "hip-hop": { hero: "hiphop-mic", mic: "hiphop-mic", perform: "hiphop-point", crowd: "hiphop-point", walk: "hiphop-point", "full-body": "hiphop-mic", profile: "hiphop-mic", back: "hiphop-point", instrument: "hiphop-mic", promo: "hiphop-point" },
  dj: { hero: "dj-table", mic: "dj-table", perform: "dj-arms-up", instrument: "dj-table", crowd: "dj-arms-up", walk: "dj-arms-up", "full-body": "dj-table", profile: "dj-table", back: "dj-arms-up", promo: "dj-arms-up" },
  indie: { hero: "indie-mic", mic: "indie-mic", instrument: "indie-guitar", perform: "indie-guitar", walk: "indie-mic", crowd: "indie-mic", "full-body": "indie-guitar", profile: "indie-mic", back: "indie-guitar", promo: "indie-mic" },
  acoustic: { hero: "acoustic-mic", mic: "acoustic-mic", instrument: "acoustic-piano", perform: "acoustic-piano", walk: "acoustic-mic", crowd: "acoustic-mic", "full-body": "acoustic-piano", profile: "acoustic-mic", back: "acoustic-mic", promo: "acoustic-mic" },
  metal: { hero: "metal-mic", mic: "metal-mic", instrument: "metal-bass", perform: "metal-mic", walk: "metal-mic", crowd: "metal-mic", "full-body": "metal-mic", profile: "metal-mic", back: "metal-mic", promo: "metal-mic" },
  rnb: { hero: "rnb-mic", mic: "rnb-mic", perform: "rnb-mic", crowd: "rnb-mic", walk: "rnb-mic", "full-body": "rnb-mic", profile: "rnb-profile", "close-up": "rnb-profile", back: "rnb-mic", instrument: "rnb-mic", promo: "rnb-profile" },
};

export function originalsAssetPath(artist: OriginalsArtist, pose: OriginalsPoseId): string {
  const dedicated = `${ORIGINALS_BASE}/${artist.slug}/${pose}.png`;
  return dedicated;
}

export function resolveStageImage(artist: OriginalsArtist, pose: OriginalsPoseId = "perform"): string {
  const categoryMap = CATEGORY_POSE_MAP[artist.poseCategory];
  const file = categoryMap?.[pose] ?? categoryMap?.mic ?? categoryMap?.hero ?? "male-pop-mic";
  return `${PERFORMER_BASE}/${file}.png`;
}

export function resolveHeroImage(artist: OriginalsArtist): string {
  return resolveStageImage(artist, "hero");
}

export function resolveAvatarGradient(artist: OriginalsArtist): string {
  return artist.brand.gradient;
}

export function getAvailablePoses(artist: OriginalsArtist): OriginalsPoseId[] {
  return ["mic", "perform", "walk", "crowd", "close-up", "profile", "back", "full-body", "instrument", "promo"];
}
