/**
 * Builds full Artist Bible entries from roster seeds.
 * Used by the JSON generator script.
 */
import { buildStableAppearance } from "@/data/demo/artists/appearance";
import { buildArtistBrand, buildArtistImages } from "@/data/demo/artists/assets";
import type { DemoArtistEntry, ArtistGenre } from "@/data/demo/artists/types";
import { DEMO_ARTIST_IDENTITY } from "@/data/shared/environment";

type RosterSeed = {
  id: string;
  name: string;
  genre: string;
  actType: "solo" | "duo" | "band" | "group";
  hometown: string;
  tagline: string;
  aesthetic: string;
  brand: { primary: string; secondary: string; accent: string; gradient: string };
  poseCategory: string;
  monthlyListeners: number;
  followers: number;
  fanDemographic: string;
  currentTour: string;
  albumTitle: string;
  singleTitle: string;
  manager: string;
  status: "LIVE" | "ON TOUR" | "REHEARSAL" | "IDLE";
  featured?: boolean;
  liveAudience: number;
  revenueTonight: number;
  merchSalesTonight: number;
  showsScheduled: number;
  growthPct: number;
};

function parseCountry(hometown: string): string {
  if (hometown.includes(", UK")) return "United Kingdom";
  if (hometown.includes(", ON") || hometown.includes(", QC") || hometown.includes(", BC")) return "Canada";
  if (hometown.includes(", KR")) return "South Korea";
  if (hometown.includes(", NL")) return "Netherlands";
  if (hometown.includes(", DE")) return "Germany";
  if (hometown.includes(", ES")) return "Spain";
  if (hometown.includes(", NO")) return "Norway";
  if (hometown.includes(", IS")) return "Iceland";
  if (hometown.includes(", AU")) return "Australia";
  if (hometown.includes(", JP")) return "Japan";
  if (hometown.includes(", NG")) return "Nigeria";
  if (hometown.includes(", GH")) return "Ghana";
  if (hometown.includes(", PR")) return "Puerto Rico";
  if (hometown.includes(", IE")) return "Ireland";
  if (hometown.includes(", NS")) return "Canada";
  return "United States";
}

function genreToSubGenre(genre: string): string {
  return genre;
}

function mapGenre(genre: string): ArtistGenre {
  const map: Record<string, ArtistGenre> = {
    "Modern Pop": "Pop",
    "Dream Pop": "Dream Pop",
    "Alternative Pop": "Alternative Pop",
    "Latin Pop": "Latin Pop",
    "Rock": "Rock",
    "Alternative Rock": "Alternative Rock",
    "Hard Rock": "Hard Rock",
    "Metal": "Metal",
    "Country": "Country",
    "Americana": "Americana",
    "Folk": "Folk",
    "Acoustic": "Acoustic",
    "Hip-Hop": "Hip Hop",
    "R&B": "R&B",
    "Contemporary R&B": "Contemporary R&B",
    "Alternative R&B": "Alternative R&B",
    "Neo Soul": "Neo Soul",
    "Soul": "Soul",
    "Pop/R&B": "Pop/R&B",
    "Indie Rock": "Indie Rock",
    "Indie Pop": "Indie Pop",
    "EDM": "EDM",
    "House": "House",
    "Electronic": "Electronic",
    "DJ": "DJ",
    "Electronic Duo": "Electronic Duo",
    "Jazz": "Jazz",
    "Blues": "Blues",
    "Punk": "Punk",
    "Afrobeats": "Afrobeats",
    "Singer Songwriter": "Singer Songwriter",
  };
  return map[genre] ?? "Pop";
}

export function buildArtistBibleEntry(seed: RosterSeed): DemoArtistEntry {
  const id = seed.id;
  const appearance = buildStableAppearance(id, seed.aesthetic, seed.genre);
  const images = buildArtistImages(id, seed.poseCategory);
  const brand = buildArtistBrand(
    id,
    seed.brand.primary,
    seed.brand.secondary,
    seed.brand.accent,
    seed.brand.gradient,
    seed.aesthetic,
  );

  const ticketPrice = 45 + (seed.followers % 40);
  const vipPrice = 125 + (seed.followers % 80);

  return {
    ...DEMO_ARTIST_IDENTITY,
    id,
    stageName: seed.name,
    realName: seed.actType === "solo" ? seed.name : `${seed.name} (collective)`,
    genre: mapGenre(seed.genre),
    subGenre: genreToSubGenre(seed.genre),
    hometown: seed.hometown,
    country: parseCountry(seed.hometown),
    yearsActive: 3 + (id.length % 12),
    label: "LiveCircuit Originals",
    management: seed.manager,
    bio: `${seed.name} is a ${seed.genre.toLowerCase()} act from ${seed.hometown}. ${seed.tagline}. Known for ${seed.aesthetic.toLowerCase()}, they've built a devoted global fanbase on LiveCircuit with ${seed.followers.toLocaleString()} followers.`,
    brand,
    appearance,
    images,
    merchCollection: [
      { id: `${id}-tee`, name: `${seed.currentTour} Tour Tee`, price: 35, imagePath: `/assets/merch/${id}/${id}-tee.png` },
      { id: `${id}-hoodie`, name: `${seed.name} Glow Hoodie`, price: 65, imagePath: `/assets/merch/${id}/${id}-hoodie.png` },
      { id: `${id}-vinyl`, name: `${seed.albumTitle} Vinyl`, price: 45, imagePath: `/assets/merch/${id}/${id}-vinyl.png` },
    ],
    followers: seed.followers,
    monthlyListeners: seed.monthlyListeners,
    fanRating: 4.2 + (seed.growthPct % 8) / 10,
    averageAttendance: seed.liveAudience || Math.round(seed.followers * 0.08),
    ticketPrice,
    vipPrice,
    merchRevenue: seed.merchSalesTonight * 120,
    tourRevenue: seed.revenueTonight * 45,
    careerRevenue: seed.revenueTonight * 180,
    verified: true,
    featured: seed.featured ?? false,
    socialLinks: {
      livecircuit: `/${id}`,
      website: `https://livecircuit.demo/${id}`,
      instagram: `@${id.replace(/-/g, "")}`,
    },
    currentTour: {
      name: seed.currentTour,
      posterPath: images.tourPoster,
      upcomingShows: [
        { city: "Boston", venue: "Boston Harbor Arena", date: "Sep 12", ticketPrice, vipPrice },
        { city: "Chicago", venue: "Windy City Stadium", date: "Sep 19", ticketPrice: ticketPrice + 10, vipPrice: vipPrice + 26 },
        { city: "Dallas", venue: "Lone Star Arena", date: "Sep 26", ticketPrice, vipPrice },
        { city: "Miami", venue: "Miami Pulse Arena", date: "Oct 3", ticketPrice: ticketPrice + 5, vipPrice },
      ],
    },
    favoriteVenue: "Boston Harbor Arena",
    performance: {
      signatureMove: seed.tagline,
      signatureLighting: "purple-magenta-cyan",
      signatureAnimation: "crowd-wave pulse",
      preferredArenaTheme: "premium-festival",
      preferredPyro: seed.genre.includes("Rock") || seed.genre.includes("EDM"),
      preferredConfetti: seed.genre.includes("Pop") || seed.genre === "EDM",
      preferredLighting: ["purple", "cyan", "magenta"],
      preferredCameraAngles: ["vip", "stage-left", "default"],
      musicStyle: seed.genre,
      performanceStyle: seed.aesthetic,
    },
    personality: seed.tagline,
    fanDemographics: seed.fanDemographic,
    targetAudience: seed.fanDemographic,
    catchPhrase: seed.tagline,
    actType: seed.actType,
    liveStatus: seed.status,
    poseCategory: seed.poseCategory,
    liveAudience: seed.liveAudience,
    revenueTonight: seed.revenueTonight,
    growthPct: seed.growthPct,
    showsScheduled: seed.showsScheduled,
    albumTitle: seed.albumTitle,
    singleTitle: seed.singleTitle,
    avatarInitials: seed.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
  };
}

export function rosterSeedFromLegacy(legacy: {
  id: string;
  name: string;
  genre: string;
  actType: "solo" | "duo" | "band" | "group";
  hometown: string;
  tagline: string;
  aesthetic: string;
  brand: { primary: string; secondary: string; accent: string; gradient: string };
  poseCategory: string;
  monthlyListeners: number;
  followers: number;
  fanDemographic: string;
  currentTour: string;
  albumTitle: string;
  singleTitle: string;
  manager: string;
  status: "LIVE" | "ON TOUR" | "REHEARSAL" | "IDLE";
  featured?: boolean;
  liveAudience: number;
  revenueTonight: number;
  merchSalesTonight: number;
  showsScheduled: number;
  growthPct: number;
}): RosterSeed {
  return legacy;
}
