/** Deterministic appearance profiles — same artist ID always yields same appearance. */

const SKIN_TONES = [
  "deep ebony", "rich brown", "warm caramel", "golden tan", "olive medium",
  "light brown", "fair with warm undertones", "porcelain cool", "bronze sun-kissed", "deep mahogany",
  "medium wheat", "honey beige", "copper brown", "espresso", "sand neutral",
];

const HAIR_TEXTURES = [
  "coily 4C", "tight curls", "loose curls", "wavy", "straight sleek",
  "braided locs", "afro natural", "textured crop", "finger waves", "voluminous curls",
  "dreadlocks", "box braids", "shaved sides", "natural afro puff", "layered waves",
];

const HAIR_COLORS = [
  "jet black", "dark brown", "chestnut", "auburn", "platinum blonde",
  "honey blonde", "copper red", "silver grey", "purple ombre", "blue-black",
  "pastel pink tips", "natural black", "golden highlights", "burgundy", "white blonde",
];

const EYE_COLORS = [
  "dark brown", "amber brown", "hazel", "green", "blue-grey",
  "deep brown", "light brown", "grey", "blue", "heterochromia green-brown",
];

const BODY_TYPES = [
  "athletic lean", "slim tall", "curvy strong", "muscular broad", "petite compact",
  "average build", "long-limbed", "stocky powerful", "willowy", "dancer-fit",
];

const HEIGHTS = ["5'2\"", "5'4\"", "5'6\"", "5'8\"", "5'10\"", "6'0\"", "6'2\"", "6'4\""];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: T[], id: string, salt = 0): T {
  return arr[(hashId(id) + salt) % arr.length]!;
}

export type StableAppearance = {
  skinTone: string;
  hairTexture: string;
  hairColor: string;
  eyeColor: string;
  faceDescription: string;
  bodyType: string;
  height: string;
  fashionStyle: string;
  accessories: string[];
  stageOutfit: string;
  streetOutfit: string;
  performanceOutfit: string;
};

export function buildStableAppearance(id: string, aesthetic: string, genre: string): StableAppearance {
  const skinTone = pick(SKIN_TONES, id, 0);
  const hairTexture = pick(HAIR_TEXTURES, id, 1);
  const hairColor = pick(HAIR_COLORS, id, 2);
  const eyeColor = pick(EYE_COLORS, id, 3);
  const bodyType = pick(BODY_TYPES, id, 4);
  const height = pick(HEIGHTS, id, 5);

  return {
    skinTone,
    hairTexture,
    hairColor,
    eyeColor,
    faceDescription: `Distinctive ${genre.toLowerCase()} performer with ${eyeColor} eyes and ${hairTexture} ${hairColor} hair`,
    bodyType,
    height,
    fashionStyle: aesthetic,
    accessories: [pick(["chain necklace", "stud earrings", "ring stack", "wrist cuffs", "signature hat"], id, 6)],
    stageOutfit: `${aesthetic} — premium tour edition`,
    streetOutfit: `Casual ${aesthetic.toLowerCase()} off-stage look`,
    performanceOutfit: `Signature ${genre} stage ensemble with LED accents`,
  };
}
