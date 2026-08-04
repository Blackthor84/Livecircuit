import { z } from "zod";

const artistShowSchema = z.object({
  city: z.string(),
  venue: z.string(),
  date: z.string(),
  ticketPrice: z.number().optional(),
  vipPrice: z.number().optional(),
});

const artistMerchSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  imagePath: z.string(),
});

export const demoArtistEntrySchema = z.object({
  isDemoArtist: z.literal(true),
  visibility: z.literal("demo-only"),
  environment: z.literal("demo"),
  id: z.string().min(1),
  stageName: z.string().min(1),
  realName: z.string(),
  genre: z.string(),
  subGenre: z.string(),
  hometown: z.string(),
  country: z.string(),
  yearsActive: z.number().int().min(0),
  label: z.string(),
  management: z.string(),
  bio: z.string(),
  brand: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    accentColor: z.string(),
    gradientClass: z.string(),
    typography: z.string(),
    logoPath: z.string(),
    brandIconPath: z.string(),
    brandDescription: z.string(),
    brandVoice: z.string(),
  }),
  appearance: z.object({
    skinTone: z.string(),
    hairTexture: z.string(),
    hairColor: z.string(),
    eyeColor: z.string(),
    faceDescription: z.string(),
    bodyType: z.string(),
    height: z.string(),
    fashionStyle: z.string(),
    accessories: z.array(z.string()),
    stageOutfit: z.string(),
    streetOutfit: z.string(),
    performanceOutfit: z.string(),
  }),
  images: z.object({
    heroImage: z.string(),
    portraitImage: z.string(),
    transparentPNG: z.string(),
    tourPoster: z.string(),
    albumCover: z.string(),
    arenaBanner: z.string(),
    vipImage: z.string(),
    poses: z.record(z.string(), z.string()),
  }),
  merchCollection: z.array(artistMerchSchema),
  followers: z.number().int().min(0),
  monthlyListeners: z.number().int().min(0),
  fanRating: z.number().min(0).max(5),
  averageAttendance: z.number().int().min(0),
  ticketPrice: z.number().min(0),
  vipPrice: z.number().min(0),
  merchRevenue: z.number().min(0),
  tourRevenue: z.number().min(0),
  careerRevenue: z.number().min(0),
  verified: z.boolean(),
  featured: z.boolean(),
  socialLinks: z.object({
    livecircuit: z.string(),
    website: z.string().optional(),
    instagram: z.string().optional(),
    tiktok: z.string().optional(),
  }),
  currentTour: z.object({
    name: z.string(),
    posterPath: z.string(),
    upcomingShows: z.array(artistShowSchema),
  }),
  favoriteVenue: z.string(),
  performance: z.object({
    signatureMove: z.string(),
    signatureLighting: z.string(),
    signatureAnimation: z.string(),
    preferredArenaTheme: z.string(),
    preferredPyro: z.boolean(),
    preferredConfetti: z.boolean(),
    preferredLighting: z.array(z.string()),
    preferredCameraAngles: z.array(z.string()),
    musicStyle: z.string(),
    performanceStyle: z.string(),
  }),
  personality: z.string(),
  fanDemographics: z.string(),
  targetAudience: z.string(),
  catchPhrase: z.string(),
  actType: z.enum(["solo", "duo", "band", "group"]),
  liveStatus: z.enum(["LIVE", "ON TOUR", "REHEARSAL", "IDLE"]),
  poseCategory: z.string(),
  liveAudience: z.number().int().min(0),
  revenueTonight: z.number().min(0),
  growthPct: z.number(),
  showsScheduled: z.number().int().min(0),
  albumTitle: z.string(),
  singleTitle: z.string(),
  avatarInitials: z.string(),
});

/** @deprecated Use demoArtistEntrySchema */
export const artistBibleEntrySchema = demoArtistEntrySchema;

export const demoArtistRosterSchema = z.object({
  version: z.number(),
  generatedAt: z.string(),
  environment: z.literal("demo"),
  artists: z.array(demoArtistEntrySchema),
});

/** @deprecated */
export const artistBibleRosterSchema = demoArtistRosterSchema;

export type ValidatedDemoArtistEntry = z.infer<typeof demoArtistEntrySchema>;

export function validateArtistEntry(data: unknown) {
  return demoArtistEntrySchema.parse(data);
}

export function validateRoster(data: unknown) {
  return demoArtistRosterSchema.parse(data);
}
