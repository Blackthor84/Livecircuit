import type { OriginalsArtist, OriginalsBrandColors, OriginalsRosterGroup } from "@/lib/demo/originals/types";

const BRAND_PRESETS: Record<string, OriginalsBrandColors> = {
  violet: { primary: "#a855f7", secondary: "#7c3aed", accent: "#c084fc", gradient: "from-violet-500 to-purple-600" },
  cyan: { primary: "#06b6d4", secondary: "#0891b2", accent: "#22d3ee", gradient: "from-cyan-500 to-blue-600" },
  rose: { primary: "#f43f5e", secondary: "#e11d48", accent: "#fb7185", gradient: "from-rose-500 to-pink-600" },
  amber: { primary: "#f59e0b", secondary: "#d97706", accent: "#fbbf24", gradient: "from-amber-500 to-orange-600" },
  emerald: { primary: "#10b981", secondary: "#059669", accent: "#34d399", gradient: "from-emerald-500 to-teal-600" },
  indigo: { primary: "#6366f1", secondary: "#4f46e5", accent: "#818cf8", gradient: "from-indigo-500 to-violet-600" },
  fuchsia: { primary: "#d946ef", secondary: "#c026d3", accent: "#e879f9", gradient: "from-fuchsia-500 to-purple-600" },
  slate: { primary: "#64748b", secondary: "#475569", accent: "#94a3b8", gradient: "from-slate-500 to-zinc-600" },
};

type Seed = {
  name: string;
  genre: OriginalsArtist["genre"];
  actType: OriginalsArtist["actType"];
  hometown: string;
  tagline: string;
  aesthetic: string;
  brand: keyof typeof BRAND_PRESETS;
  poseCategory: string;
  monthlyListeners: number;
  followers: number;
  fanDemographic: string;
  currentTour: string;
  albumTitle: string;
  singleTitle: string;
  manager: string;
  status: OriginalsArtist["status"];
  featured?: boolean;
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function build(group: OriginalsRosterGroup, seeds: Seed[]): OriginalsArtist[] {
  return seeds.map((s, i) => {
    const id = slugify(s.name);
    const brand = BRAND_PRESETS[s.brand]!;
    const baseAudience = s.status === "LIVE" ? 8000 + i * 900 : s.status === "ON TOUR" ? 5000 + i * 400 : 0;
    const baseRevenue = s.status === "LIVE" ? 12000 + i * 1800 : s.status === "ON TOUR" ? 6000 + i * 700 : 2000 + i * 300;
    return {
      id,
      slug: id,
      name: s.name,
      genre: s.genre,
      rosterGroup: group,
      actType: s.actType,
      hometown: s.hometown,
      bio: `${s.name} is a ${s.genre.toLowerCase()} act from ${s.hometown}. ${s.tagline}. Known for ${s.aesthetic.toLowerCase()}, they've built a devoted global fanbase on LiveCircuit.`,
      tagline: s.tagline,
      aesthetic: s.aesthetic,
      brand,
      avatar: initials(s.name),
      logoMark: initials(s.name),
      monthlyListeners: s.monthlyListeners,
      followers: s.followers,
      fanDemographic: s.fanDemographic,
      currentTour: s.currentTour,
      upcomingDates: [
        { city: "Boston", venue: "Boston Harbor Arena", date: "Sep 12" },
        { city: "Chicago", venue: "Windy City Stadium", date: "Sep 19" },
        { city: "Dallas", venue: "Lone Star Arena", date: "Sep 26" },
        { city: "Miami", venue: "Miami Pulse Arena", date: "Oct 3" },
      ],
      merch: [
        { id: `${id}-tee`, name: `${s.currentTour} Tour Tee`, price: 35 },
        { id: `${id}-hoodie`, name: `${s.name} Glow Hoodie`, price: 65 },
        { id: `${id}-vinyl`, name: `${s.albumTitle} Vinyl`, price: 45 },
      ],
      albumTitle: s.albumTitle,
      singleTitle: s.singleTitle,
      poseCategory: s.poseCategory,
      manager: s.manager,
      liveAudience: baseAudience,
      revenueTonight: baseRevenue,
      merchSalesTonight: Math.round(baseRevenue * 0.22),
      showsScheduled: 3 + (i % 12),
      status: s.status,
      growthPct: 8 + (i % 17) + (s.featured ? 4 : 0),
      featured: s.featured,
    };
  });
}

const POP: Seed[] = [
  { name: "Nova Lane", genre: "Modern Pop", actType: "solo", hometown: "Los Angeles, CA", tagline: "Stadium pop with neon heart", aesthetic: "Sequined streetwear and LED accents", brand: "violet", poseCategory: "female-pop", monthlyListeners: 4_820_000, followers: 2_140_000, fanDemographic: "16–34, global pop superfans", currentTour: "Starlight Circuit", albumTitle: "Midnight Frequency", singleTitle: "Glass Horizon", manager: "Sarah Chen", status: "LIVE", featured: true },
  { name: "Luna Coast", genre: "Dream Pop", actType: "solo", hometown: "Portland, OR", tagline: "Hazy anthems for midnight drives", aesthetic: "Ethereal layers and pastel glow", brand: "cyan", poseCategory: "female-pop", monthlyListeners: 1_920_000, followers: 890_000, fanDemographic: "18–28, indie-pop listeners", currentTour: "Tidal Glow", albumTitle: "Soft Voltage", singleTitle: "Moonlit Echo", manager: "James Park", status: "ON TOUR" },
  { name: "Solstice Ray", genre: "Modern Pop", actType: "solo", hometown: "Atlanta, GA", tagline: "Hook-first pop architect", aesthetic: "Bold color blocking and tour chains", brand: "fuchsia", poseCategory: "female-pop", monthlyListeners: 2_640_000, followers: 1_120_000, fanDemographic: "15–30, streaming-first", currentTour: "Pulse Parade", albumTitle: "Afterglow City", singleTitle: "Runway Heart", manager: "Sarah Chen", status: "LIVE" },
  { name: "Kira Bloom", genre: "Alternative Pop", actType: "solo", hometown: "Toronto, ON", tagline: "Pop precision with alt edge", aesthetic: "Minimal chrome and soft punk", brand: "rose", poseCategory: "female-pop", monthlyListeners: 1_480_000, followers: 620_000, fanDemographic: "17–32, alt-pop crossover", currentTour: "Chrome Petals", albumTitle: "Static Bloom", singleTitle: "Velvet Signal", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "Jax Meridian", genre: "Modern Pop", actType: "solo", hometown: "London, UK", tagline: "UK pop export with arena scale", aesthetic: "Tailored street-luxe", brand: "indigo", poseCategory: "male-pop", monthlyListeners: 3_100_000, followers: 1_450_000, fanDemographic: "16–35, UK/EU pop", currentTour: "Meridian Nights", albumTitle: "North Star", singleTitle: "Golden Relay", manager: "Sarah Chen", status: "LIVE" },
  { name: "Aria Sol", genre: "Latin Pop", actType: "solo", hometown: "Miami, FL", tagline: "Bilingual pop powerhouse", aesthetic: "Tropical futurism", brand: "amber", poseCategory: "female-pop", monthlyListeners: 2_890_000, followers: 1_280_000, fanDemographic: "18–40, Latin pop/global", currentTour: "Sol y Circuit", albumTitle: "Fuego Suave", singleTitle: "Baila Luz", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "Theo Prism", genre: "Alternative Pop", actType: "solo", hometown: "Chicago, IL", tagline: "Synth-pop confessionals", aesthetic: "Iridescent outerwear", brand: "cyan", poseCategory: "male-pop", monthlyListeners: 980_000, followers: 410_000, fanDemographic: "19–33, alt-pop", currentTour: "Prism Rooms", albumTitle: "Clear Static", singleTitle: "Mirror Talk", manager: "James Park", status: "REHEARSAL" },
  { name: "Vera Night", genre: "Modern Pop", actType: "solo", hometown: "Seoul, KR", tagline: "K-influenced global pop", aesthetic: "Futurist stage couture", brand: "violet", poseCategory: "female-pop", monthlyListeners: 5_200_000, followers: 2_800_000, fanDemographic: "14–28, global K-pop/adjacent", currentTour: "Neon Dynasty", albumTitle: "City of Glass", singleTitle: "Starfall", manager: "Sarah Chen", status: "LIVE" },
  { name: "Caden Lux", genre: "Modern Pop", actType: "solo", hometown: "Nashville, TN", tagline: "Pop with southern warmth", aesthetic: "Denim and gold chains", brand: "amber", poseCategory: "male-pop", monthlyListeners: 1_760_000, followers: 780_000, fanDemographic: "18–36, pop/country crossover", currentTour: "Southern Lights", albumTitle: "Highway Halo", singleTitle: "Stay Golden", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "Elara Vox", genre: "Alternative Pop", actType: "solo", hometown: "Berlin, DE", tagline: "European electro-pop pulse", aesthetic: "Industrial glam", brand: "slate", poseCategory: "female-pop", monthlyListeners: 1_340_000, followers: 590_000, fanDemographic: "20–35, EU electronic pop", currentTour: "Voltage Bloom", albumTitle: "Neon Testament", singleTitle: "Wire Heart", manager: "James Park", status: "IDLE" },
];

const RNB_SOLO: Seed[] = [
  { name: "Velvet Midnight", genre: "Contemporary R&B", actType: "solo", hometown: "Detroit, MI", tagline: "Silk vocals over modern trap-soul", aesthetic: "Midnight satin and gold", brand: "rose", poseCategory: "rnb", monthlyListeners: 2_240_000, followers: 980_000, fanDemographic: "18–35, R&B streaming core", currentTour: "Velvet Hours", albumTitle: "After Midnight", singleTitle: "Slow Burn", manager: "James Park", status: "LIVE", featured: true },
  { name: "Aurora Blue", genre: "Neo Soul", actType: "solo", hometown: "New Orleans, LA", tagline: "Soul rooted in brass and bloom", aesthetic: "Vintage soul modern cut", brand: "indigo", poseCategory: "rnb", monthlyListeners: 1_680_000, followers: 720_000, fanDemographic: "22–44, neo-soul devotees", currentTour: "Blue Hour Sessions", albumTitle: "Riverlight", singleTitle: "Golden Tide", manager: "Sarah Chen", status: "ON TOUR", featured: true },
  { name: "Darius Lumen", genre: "R&B", actType: "solo", hometown: "Houston, TX", tagline: "Late-night groove architect", aesthetic: "Tailored soul luxury", brand: "violet", poseCategory: "rnb", monthlyListeners: 1_920_000, followers: 840_000, fanDemographic: "20–38, Southern R&B", currentTour: "Lumen Lines", albumTitle: "City Glow", singleTitle: "Hold On", manager: "Marcus Lee", status: "LIVE" },
  { name: "Priya Echo", genre: "Contemporary R&B", actType: "solo", hometown: "London, UK", tagline: "UK R&B with global reach", aesthetic: "Minimal monochrome soul", brand: "slate", poseCategory: "rnb", monthlyListeners: 1_120_000, followers: 510_000, fanDemographic: "18–32, UK R&B", currentTour: "Echo Chamber", albumTitle: "Still Waters", singleTitle: "Phase", manager: "James Park", status: "ON TOUR" },
  { name: "Malik Horizon", genre: "Alternative R&B", actType: "solo", hometown: "Philadelphia, PA", tagline: "Alt-R&B mood scientist", aesthetic: "Earth tones and layered chains", brand: "emerald", poseCategory: "rnb", monthlyListeners: 890_000, followers: 380_000, fanDemographic: "19–34, alt-R&B", currentTour: "Horizon Lines", albumTitle: "Dusk Theory", singleTitle: "Fade Into", manager: "Marcus Lee", status: "REHEARSAL" },
  { name: "Talia Midnight", genre: "R&B", actType: "solo", hometown: "Oakland, CA", tagline: "Bay Area soul revival", aesthetic: "90s soul with future bass", brand: "fuchsia", poseCategory: "rnb", monthlyListeners: 1_450_000, followers: 620_000, fanDemographic: "21–36, West Coast R&B", currentTour: "Bay Lights", albumTitle: "Midnight Bay", singleTitle: "Stay Close", manager: "Sarah Chen", status: "LIVE" },
  { name: "Cyrus Velvet", genre: "Neo Soul", actType: "solo", hometown: "Memphis, TN", tagline: "Organ-soaked soul modernist", aesthetic: "Velvet blazers and vintage mic", brand: "amber", poseCategory: "rnb", monthlyListeners: 760_000, followers: 340_000, fanDemographic: "25–45, classic soul fans", currentTour: "Velvet Rooms", albumTitle: "Southern Silk", singleTitle: "River Song", manager: "James Park", status: "ON TOUR" },
  { name: "Naia Radiant", genre: "Contemporary R&B", actType: "solo", hometown: "Sydney, AU", tagline: "Pacific soul with pop polish", aesthetic: "Oceanic glam", brand: "cyan", poseCategory: "rnb", monthlyListeners: 1_080_000, followers: 470_000, fanDemographic: "18–33, APAC R&B", currentTour: "Radiant Coast", albumTitle: "Pacific Blue", singleTitle: "Tidal Love", manager: "Marcus Lee", status: "IDLE" },
  { name: "Imani Cascade", genre: "Alternative R&B", actType: "solo", hometown: "Brooklyn, NY", tagline: "Harmony-stack virtuoso", aesthetic: "Studio-to-stage elegance", brand: "violet", poseCategory: "rnb", monthlyListeners: 1_320_000, followers: 580_000, fanDemographic: "20–35, NYC alt-R&B", currentTour: "Cascade Sessions", albumTitle: "Layered Light", singleTitle: "Freefall", manager: "Sarah Chen", status: "LIVE" },
  { name: "Andre Solace", genre: "Soul", actType: "solo", hometown: "Chicago, IL", tagline: "Classic soul for new arenas", aesthetic: "Sharp suits and live brass", brand: "indigo", poseCategory: "rnb", monthlyListeners: 940_000, followers: 420_000, fanDemographic: "24–48, soul traditionalists", currentTour: "Solace Live", albumTitle: "Heartland Soul", singleTitle: "Come Home", manager: "James Park", status: "ON TOUR" },
];

const RNB_GROUP: Seed[] = [
  { name: "Kings & Roses", genre: "R&B", actType: "group", hometown: "Atlanta, GA", tagline: "Harmony-heavy R&B collective", aesthetic: "Coordinated stage couture", brand: "rose", poseCategory: "rnb", monthlyListeners: 2_680_000, followers: 1_180_000, fanDemographic: "17–32, R&B group fans", currentTour: "Thorns & Crowns", albumTitle: "Royal Bloom", singleTitle: "Together", manager: "Sarah Chen", status: "LIVE", featured: true },
  { name: "The After Hours", genre: "Soul", actType: "band", hometown: "Detroit, MI", tagline: "Live soul band for the arena age", aesthetic: "Vintage instruments, modern lights", brand: "amber", poseCategory: "rnb", monthlyListeners: 1_540_000, followers: 690_000, fanDemographic: "22–42, live soul", currentTour: "After Hours Live", albumTitle: "Clockwork Soul", singleTitle: "2AM", manager: "Marcus Lee", status: "ON TOUR", featured: true },
  { name: "Electric Avenue", genre: "Pop/R&B", actType: "duo", hometown: "Los Angeles, CA", tagline: "Pop/R&B crossover duo", aesthetic: "Matching neon streetwear", brand: "fuchsia", poseCategory: "rnb", monthlyListeners: 1_890_000, followers: 820_000, fanDemographic: "16–30, pop-R&B hybrid", currentTour: "Avenue Lights", albumTitle: "Crosswalk", singleTitle: "Electric Love", manager: "Sarah Chen", status: "LIVE", featured: true },
  { name: "Velvet Union", genre: "Contemporary R&B", actType: "group", hometown: "Toronto, ON", tagline: "Four-part R&B precision", aesthetic: "Monochrome velvet suits", brand: "violet", poseCategory: "rnb", monthlyListeners: 1_120_000, followers: 490_000, fanDemographic: "18–34, vocal group fans", currentTour: "Union Tour", albumTitle: "Four Corners", singleTitle: "Align", manager: "James Park", status: "ON TOUR" },
  { name: "Soul Circuit", genre: "Soul", actType: "band", hometown: "Memphis, TN", tagline: "Circuit-bending soul ensemble", aesthetic: "Retro funk stage wear", brand: "emerald", poseCategory: "rnb", monthlyListeners: 780_000, followers: 350_000, fanDemographic: "25–50, funk/soul", currentTour: "Circuit Live", albumTitle: "Live Wire Soul", singleTitle: "Groove Theory", manager: "Marcus Lee", status: "REHEARSAL" },
  { name: "Harmonic Tide", genre: "R&B", actType: "group", hometown: "Miami, FL", tagline: "Coastal R&B harmonies", aesthetic: "Tropical formal", brand: "cyan", poseCategory: "rnb", monthlyListeners: 920_000, followers: 410_000, fanDemographic: "19–33, coastal R&B", currentTour: "Tide Lines", albumTitle: "Shoreline", singleTitle: "Wave", manager: "Sarah Chen", status: "LIVE" },
  { name: "Midnight Collective", genre: "Alternative R&B", actType: "group", hometown: "Seattle, WA", tagline: "Alt-R&B with live instrumentation", aesthetic: "Dark minimal stage wear", brand: "slate", poseCategory: "rnb", monthlyListeners: 640_000, followers: 290_000, fanDemographic: "20–36, alt-R&B live", currentTour: "Collective Nights", albumTitle: "Grey Hour", singleTitle: "Assemble", manager: "James Park", status: "ON TOUR" },
  { name: "Golden Standard", genre: "Neo Soul", actType: "band", hometown: "Nashville, TN", tagline: "Neo-soul with country warmth", aesthetic: "Southern soul formal", brand: "amber", poseCategory: "rnb", monthlyListeners: 560_000, followers: 250_000, fanDemographic: "24–44, neo-soul/country", currentTour: "Standard Live", albumTitle: "Gold Leaf", singleTitle: "Measure", manager: "Marcus Lee", status: "IDLE" },
  { name: "Rose Avenue", genre: "Pop/R&B", actType: "duo", hometown: "New York, NY", tagline: "NYC pop-soul duo", aesthetic: "City chic matching sets", brand: "rose", poseCategory: "rnb", monthlyListeners: 1_340_000, followers: 580_000, fanDemographic: "17–31, NYC pop-R&B", currentTour: "Rose Circuit", albumTitle: "Borough Bloom", singleTitle: "Uptown", manager: "Sarah Chen", status: "LIVE" },
  { name: "The Velvet Line", genre: "Contemporary R&B", actType: "group", hometown: "Houston, TX", tagline: "Texas-sized R&B harmonies", aesthetic: "Western soul fusion", brand: "indigo", poseCategory: "rnb", monthlyListeners: 880_000, followers: 390_000, fanDemographic: "18–35, Southern R&B groups", currentTour: "Velvet Line Live", albumTitle: "Long Line", singleTitle: "Hold the Line", manager: "James Park", status: "ON TOUR" },
];

const HIP_HOP: Seed[] = [
  { name: "Rebel Phase", genre: "Hip-Hop", actType: "solo", hometown: "Bronx, NY", tagline: "Bars built for stadiums", aesthetic: "Designer streetwear and chains", brand: "amber", poseCategory: "hip-hop", monthlyListeners: 3_420_000, followers: 1_560_000, fanDemographic: "16–32, hip-hop core", currentTour: "Rebel Circuit", albumTitle: "Phase Shift", singleTitle: "No Limit", manager: "Marcus Lee", status: "LIVE", featured: true },
  { name: "Orion Kite", genre: "Hip-Hop", actType: "solo", hometown: "Atlanta, GA", tagline: "Melodic trap visionary", aesthetic: "Future street luxury", brand: "violet", poseCategory: "hip-hop", monthlyListeners: 2_890_000, followers: 1_280_000, fanDemographic: "15–28, trap/melodic rap", currentTour: "Kite Season", albumTitle: "Sky Tax", singleTitle: "Orbit", manager: "Marcus Lee", status: "LIVE" },
  { name: "Zion Pager", genre: "Hip-Hop", actType: "solo", hometown: "Chicago, IL", tagline: "Midwest flow architect", aesthetic: "Workwear high fashion", brand: "slate", poseCategory: "hip-hop", monthlyListeners: 1_640_000, followers: 720_000, fanDemographic: "18–34, Midwest hip-hop", currentTour: "Pager Lines", albumTitle: "Static Pages", singleTitle: "Ring", manager: "James Park", status: "ON TOUR" },
  { name: "Naomi Grid", genre: "Hip-Hop", actType: "solo", hometown: "Los Angeles, CA", tagline: "West Coast lyricist commander", aesthetic: "Coastal hip-hop glam", brand: "cyan", poseCategory: "hip-hop", monthlyListeners: 2_120_000, followers: 940_000, fanDemographic: "17–33, West Coast rap", currentTour: "Grid Lock", albumTitle: "Pixel Throne", singleTitle: "Command", manager: "Sarah Chen", status: "LIVE" },
  { name: "Titan Circuit", genre: "Hip-Hop", actType: "solo", hometown: "Houston, TX", tagline: "808 earthquake performer", aesthetic: "Southern rap maximalism", brand: "amber", poseCategory: "hip-hop", monthlyListeners: 2_560_000, followers: 1_120_000, fanDemographic: "16–30, Southern hip-hop", currentTour: "Circuit Breaker", albumTitle: "Heavy Current", singleTitle: "Quake", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "Sable Ink", genre: "Hip-Hop", actType: "solo", hometown: "Philadelphia, PA", tagline: "Wordcraft heavyweight", aesthetic: "Poetic street scholar", brand: "indigo", poseCategory: "hip-hop", monthlyListeners: 980_000, followers: 430_000, fanDemographic: "20–38, lyrical hip-hop", currentTour: "Ink Well", albumTitle: "Written in Smoke", singleTitle: "Pen Game", manager: "James Park", status: "REHEARSAL" },
  { name: "Blaze Monroe", genre: "Hip-Hop", actType: "solo", hometown: "Miami, FL", tagline: "Party rap arena specialist", aesthetic: "Festival hip-hop fashion", brand: "fuchsia", poseCategory: "hip-hop", monthlyListeners: 1_780_000, followers: 780_000, fanDemographic: "18–29, party rap", currentTour: "Blaze Out", albumTitle: "Heat Check", singleTitle: "Turn Up", manager: "Sarah Chen", status: "LIVE" },
  { name: "Nyx Protocol", genre: "Hip-Hop", actType: "solo", hometown: "Berlin, DE", tagline: "Futurist rap icon", aesthetic: "Cyberpunk street", brand: "violet", poseCategory: "hip-hop", monthlyListeners: 1_240_000, followers: 540_000, fanDemographic: "18–32, experimental rap", currentTour: "Protocol Live", albumTitle: "Dark Net", singleTitle: "Execute", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "Cruz Alibi", genre: "Hip-Hop", actType: "solo", hometown: "San Juan, PR", tagline: "Latin trap crossover", aesthetic: "Island street couture", brand: "emerald", poseCategory: "hip-hop", monthlyListeners: 2_340_000, followers: 1_020_000, fanDemographic: "16–34, Latin hip-hop", currentTour: "Alibi World", albumTitle: "Isla Verde", singleTitle: "Fuego", manager: "James Park", status: "LIVE" },
  { name: "Remy Stacks", genre: "Hip-Hop", actType: "solo", hometown: "Detroit, MI", tagline: "Detroit boom-bap revival", aesthetic: "Motor City classic", brand: "slate", poseCategory: "hip-hop", monthlyListeners: 860_000, followers: 380_000, fanDemographic: "22–40, boom-bap", currentTour: "Stack Season", albumTitle: "Assembly Line", singleTitle: "Build", manager: "Sarah Chen", status: "IDLE" },
];

const ROCK: Seed[] = [
  { name: "Crimson Harbor", genre: "Hard Rock", actType: "band", hometown: "Boston, MA", tagline: "Harbor-born hard rock storm", aesthetic: "Leather and maritime grit", brand: "rose", poseCategory: "rock-band", monthlyListeners: 2_120_000, followers: 940_000, fanDemographic: "20–42, hard rock", currentTour: "Harbor Storm", albumTitle: "Red Tide", singleTitle: "Breakwater", manager: "Sarah Chen", status: "LIVE", featured: true },
  { name: "Volt Circuit", genre: "Rock", actType: "band", hometown: "Seattle, WA", tagline: "Thunder riff collective", aesthetic: "Grunge-meets-arena polish", brand: "violet", poseCategory: "rock-band", monthlyListeners: 1_680_000, followers: 740_000, fanDemographic: "22–40, rock radio", currentTour: "Voltage Live", albumTitle: "Live Wire", singleTitle: "Overload", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "Iron Harbor", genre: "Hard Rock", actType: "band", hometown: "Portland, ME", tagline: "Coastal rock storm", aesthetic: "Work boots and stage flannel", brand: "slate", poseCategory: "rock-band", monthlyListeners: 920_000, followers: 410_000, fanDemographic: "24–48, classic rock adj", currentTour: "Iron Coast", albumTitle: "Salt & Steel", singleTitle: "Anchor", manager: "James Park", status: "LIVE" },
  { name: "Static Monarch", genre: "Rock", actType: "band", hometown: "Austin, TX", tagline: "Alternative rock royalty", aesthetic: "Texas rock stage wear", brand: "amber", poseCategory: "rock-band", monthlyListeners: 1_340_000, followers: 590_000, fanDemographic: "20–38, alt-rock", currentTour: "Monarch Reign", albumTitle: "Crown Static", singleTitle: "Throne", manager: "Sarah Chen", status: "ON TOUR" },
  { name: "Obsidian Tide", genre: "Metal", actType: "band", hometown: "Oslo, NO", tagline: "Nordic metal architects", aesthetic: "Dark stage armor aesthetic", brand: "indigo", poseCategory: "metal", monthlyListeners: 1_890_000, followers: 820_000, fanDemographic: "18–36, metal", currentTour: "Obsidian World", albumTitle: "Black Water", singleTitle: "Depths", manager: "Marcus Lee", status: "LIVE" },
  { name: "Wildframe", genre: "Rock", actType: "band", hometown: "Denver, CO", tagline: "Mountain-stage warriors", aesthetic: "Outdoor rock aesthetic", brand: "emerald", poseCategory: "rock-band", monthlyListeners: 760_000, followers: 340_000, fanDemographic: "22–44, rock/outdoor", currentTour: "Wildframe Live", albumTitle: "Peak Signal", singleTitle: "Summit", manager: "James Park", status: "REHEARSAL" },
  { name: "Blacklight Society", genre: "Rock", actType: "band", hometown: "Las Vegas, NV", tagline: "UV-lit rock spectacle", aesthetic: "Neon rock showmanship", brand: "fuchsia", poseCategory: "rock-band", monthlyListeners: 1_120_000, followers: 490_000, fanDemographic: "19–35, rock spectacle", currentTour: "Blacklight Arena", albumTitle: "UV Society", singleTitle: "Glow", manager: "Sarah Chen", status: "LIVE" },
  { name: "Summit Echo", genre: "Hard Rock", actType: "band", hometown: "Salt Lake City, UT", tagline: "Arena rock echo chambers", aesthetic: "Desert rock leather", brand: "amber", poseCategory: "rock-band", monthlyListeners: 640_000, followers: 290_000, fanDemographic: "24–46, hard rock", currentTour: "Echo Peak", albumTitle: "Altitude", singleTitle: "Climb", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "Hex Iron", genre: "Metal", actType: "band", hometown: "Birmingham, UK", tagline: "British metal pulse", aesthetic: "Industrial metal stage", brand: "slate", poseCategory: "metal", monthlyListeners: 1_560_000, followers: 680_000, fanDemographic: "18–34, metal/UK", currentTour: "Hex World", albumTitle: "Iron Spell", singleTitle: "Cast", manager: "James Park", status: "LIVE" },
  { name: "Afterglow Theory", genre: "Rock", actType: "band", hometown: "San Diego, CA", tagline: "Cinematic rock ensemble", aesthetic: "Sunset rock aesthetic", brand: "cyan", poseCategory: "rock-band", monthlyListeners: 880_000, followers: 390_000, fanDemographic: "20–36, cinematic rock", currentTour: "Afterglow Live", albumTitle: "Theory of Light", singleTitle: "Sunset", manager: "Sarah Chen", status: "IDLE" },
];

const ALTERNATIVE: Seed[] = [
  { name: "Echo Drive", genre: "Alternative Rock", actType: "band", hometown: "Portland, OR", tagline: "Anthemic alt-rock for arenas", aesthetic: "Layered guitars and moody lights", brand: "cyan", poseCategory: "rock-band", monthlyListeners: 2_480_000, followers: 1_080_000, fanDemographic: "18–36, alt-rock", currentTour: "Echo Highway", albumTitle: "Parallel Lines", singleTitle: "Drive", manager: "Sarah Chen", status: "LIVE", featured: true },
  { name: "Neon Rebellion", genre: "Alternative Rock", actType: "band", hometown: "Brooklyn, NY", tagline: "Garage-to-stadium legends", aesthetic: "Neon punk aesthetic", brand: "fuchsia", poseCategory: "rock-band", monthlyListeners: 1_920_000, followers: 840_000, fanDemographic: "17–32, alt/punk crossover", currentTour: "Rebellion Tour", albumTitle: "City Static", singleTitle: "Revolt", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "Crimson Atlas", genre: "Alternative Rock", actType: "band", hometown: "Montreal, QC", tagline: "Wall-of-sound veterans", aesthetic: "Art-rock stage design", brand: "rose", poseCategory: "rock-band", monthlyListeners: 1_340_000, followers: 590_000, fanDemographic: "20–38, art rock", currentTour: "Atlas Rising", albumTitle: "Cartography", singleTitle: "North", manager: "James Park", status: "LIVE" },
  { name: "Glass Archipelago", genre: "Alternative Rock", actType: "band", hometown: "Reykjavik, IS", tagline: "Icelandic alt-rock expanse", aesthetic: "Arctic minimal rock", brand: "cyan", poseCategory: "rock-band", monthlyListeners: 780_000, followers: 350_000, fanDemographic: "22–40, international alt", currentTour: "Glass Islands", albumTitle: "Frozen Light", singleTitle: "Drift", manager: "Sarah Chen", status: "ON TOUR" },
  { name: "The Dusk Lines", genre: "Alternative Rock", actType: "band", hometown: "Melbourne, AU", tagline: "Antipodean alt anthems", aesthetic: "Sunset rock layers", brand: "amber", poseCategory: "rock-band", monthlyListeners: 920_000, followers: 410_000, fanDemographic: "19–35, AU alt-rock", currentTour: "Dusk Circuit", albumTitle: "Horizon Lines", singleTitle: "Fade", manager: "Marcus Lee", status: "REHEARSAL" },
  { name: "Parallel Bloom", genre: "Alternative Pop", actType: "duo", hometown: "Stockholm, SE", tagline: "Scandi alt-pop duo", aesthetic: "Minimal nordic pop", brand: "indigo", poseCategory: "indie", monthlyListeners: 1_120_000, followers: 490_000, fanDemographic: "18–32, Scandi pop", currentTour: "Bloom Tour", albumTitle: "Twin Signal", singleTitle: "Mirror", manager: "James Park", status: "LIVE" },
  { name: "Fault Lines", genre: "Punk", actType: "band", hometown: "London, UK", tagline: "Punk energy, arena scale", aesthetic: "DIY punk polished", brand: "rose", poseCategory: "rock-band", monthlyListeners: 640_000, followers: 290_000, fanDemographic: "18–30, punk", currentTour: "Fault Live", albumTitle: "Crack Theory", singleTitle: "Shift", manager: "Sarah Chen", status: "ON TOUR" },
  { name: "Silver Meridian", genre: "Alternative Rock", actType: "band", hometown: "Dublin, IE", tagline: "Celtic alt-rock surge", aesthetic: "Irish rock tradition modern", brand: "emerald", poseCategory: "rock-band", monthlyListeners: 860_000, followers: 380_000, fanDemographic: "21–40, Celtic rock", currentTour: "Meridian Live", albumTitle: "Green Light", singleTitle: "Shore", manager: "Marcus Lee", status: "LIVE" },
  { name: "Hollow Frequency", genre: "Alternative Rock", actType: "band", hometown: "Vancouver, BC", tagline: "Pacific alt-rock haze", aesthetic: "Shoegaze arena scale", brand: "violet", poseCategory: "indie", monthlyListeners: 720_000, followers: 320_000, fanDemographic: "20–36, shoegaze/alt", currentTour: "Frequency Tour", albumTitle: "Empty Signal", singleTitle: "Hum", manager: "James Park", status: "IDLE" },
  { name: "North Arc", genre: "Alternative Rock", actType: "band", hometown: "Minneapolis, MN", tagline: "Midwest alt-rock precision", aesthetic: "Clean stage alt aesthetic", brand: "slate", poseCategory: "rock-band", monthlyListeners: 580_000, followers: 260_000, fanDemographic: "22–42, Midwest alt", currentTour: "Arc Live", albumTitle: "True North", singleTitle: "Compass", manager: "Sarah Chen", status: "ON TOUR" },
];

const COUNTRY: Seed[] = [
  { name: "The Wild Pines", genre: "Country", actType: "band", hometown: "Nashville, TN", tagline: "Stadium country with forest soul", aesthetic: "Denim, boots, and arena lights", brand: "amber", poseCategory: "country", monthlyListeners: 2_640_000, followers: 1_160_000, fanDemographic: "22–48, country core", currentTour: "Pine Circuit", albumTitle: "Timber & Gold", singleTitle: "Wildfire Road", manager: "Sarah Chen", status: "LIVE", featured: true },
  { name: "Clay Hollister", genre: "Country", actType: "solo", hometown: "Fort Worth, TX", tagline: "Honky-tonk to headline journey", aesthetic: "Classic cowboy modern", brand: "amber", poseCategory: "country", monthlyListeners: 1_480_000, followers: 650_000, fanDemographic: "25–50, traditional country", currentTour: "Hollister Highway", albumTitle: "Dust & Dreams", singleTitle: "Long Road", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "Tessa Wyatt", genre: "Country", actType: "solo", hometown: "Knoxville, TN", tagline: "Modern country firebrand", aesthetic: "Glitter cowboy aesthetic", brand: "rose", poseCategory: "country", monthlyListeners: 1_920_000, followers: 840_000, fanDemographic: "18–36, modern country", currentTour: "Wyatt World", albumTitle: "Southern Spark", singleTitle: "Ride Out", manager: "Sarah Chen", status: "LIVE" },
  { name: "Ridge Callahan", genre: "Country", actType: "solo", hometown: "Boise, ID", tagline: "Mountain country storyteller", aesthetic: "Outdoor country rugged", brand: "emerald", poseCategory: "country", monthlyListeners: 780_000, followers: 350_000, fanDemographic: "24–48, mountain country", currentTour: "Ridge Run", albumTitle: "High Country", singleTitle: "Summit Song", manager: "James Park", status: "ON TOUR" },
  { name: "Autumn Carter", genre: "Country", actType: "solo", hometown: "Charlotte, NC", tagline: "Nashville crossover star", aesthetic: "Country-pop stage glam", brand: "fuchsia", poseCategory: "country", monthlyListeners: 2_120_000, followers: 920_000, fanDemographic: "17–34, country-pop", currentTour: "Autumn Leaves Tour", albumTitle: "Golden Season", singleTitle: "Harvest", manager: "Marcus Lee", status: "LIVE" },
  { name: "Colton Spur", genre: "Country", actType: "solo", hometown: "Oklahoma City, OK", tagline: "Boot-stomp arena filler", aesthetic: "Rodeo-ready country", brand: "amber", poseCategory: "country", monthlyListeners: 640_000, followers: 290_000, fanDemographic: "26–52, rodeo country", currentTour: "Spur Circuit", albumTitle: "Dust Bowl Dreams", singleTitle: "Stampede", manager: "James Park", status: "REHEARSAL" },
  { name: "Hattie Lantern", genre: "Country", actType: "solo", hometown: "Asheville, NC", tagline: "Appalachian country glow", aesthetic: "Lantern-lit folk country", brand: "amber", poseCategory: "country", monthlyListeners: 520_000, followers: 230_000, fanDemographic: "24–46, folk country", currentTour: "Lantern Trail", albumTitle: "Mountain Light", singleTitle: "Glow", manager: "Sarah Chen", status: "ON TOUR" },
  { name: "Wes Montclair", genre: "Country", actType: "solo", hometown: "Denver, CO", tagline: "Stadium country showman", aesthetic: "Western arena polish", brand: "indigo", poseCategory: "country", monthlyListeners: 1_120_000, followers: 490_000, fanDemographic: "22–44, arena country", currentTour: "Montclair Live", albumTitle: "Wide Open", singleTitle: "Horizon", manager: "Marcus Lee", status: "LIVE" },
  { name: "Piper Dust", genre: "Country", actType: "solo", hometown: "Austin, TX", tagline: "Festival country favorite", aesthetic: "Boho country festival", brand: "cyan", poseCategory: "country", monthlyListeners: 890_000, followers: 390_000, fanDemographic: "19–35, festival country", currentTour: "Dust Bowl Fest", albumTitle: "Red Dirt", singleTitle: "Spin", manager: "James Park", status: "IDLE" },
  { name: "Marlowe Rivers", genre: "Country", actType: "solo", hometown: "Memphis, TN", tagline: "River-country soul blend", aesthetic: "Southern river aesthetic", brand: "rose", poseCategory: "country", monthlyListeners: 760_000, followers: 340_000, fanDemographic: "23–45, country-soul", currentTour: "Rivers Run", albumTitle: "Current", singleTitle: "Flow", manager: "Sarah Chen", status: "ON TOUR" },
];

const AMERICANA_FOLK: Seed[] = [
  { name: "Midnight Saints", genre: "Americana", actType: "band", hometown: "Tucson, AZ", tagline: "Desert americana for big stages", aesthetic: "Southwest stage wear", brand: "amber", poseCategory: "country", monthlyListeners: 1_340_000, followers: 590_000, fanDemographic: "24–48, americana", currentTour: "Saints Circuit", albumTitle: "Desert Prayer", singleTitle: "Mirage", manager: "James Park", status: "ON TOUR", featured: true },
  { name: "River & Stone", genre: "Folk", actType: "duo", hometown: "Burlington, VT", tagline: "Harmony folk for modern arenas", aesthetic: "Organic folk stage", brand: "emerald", poseCategory: "acoustic", monthlyListeners: 680_000, followers: 300_000, fanDemographic: "25–50, folk", currentTour: "River Stone Live", albumTitle: "Current & Crest", singleTitle: "Flow", manager: "Sarah Chen", status: "LIVE" },
  { name: "Dusty Cartography", genre: "Americana", actType: "solo", hometown: "Santa Fe, NM", tagline: "Map-making through song", aesthetic: "Desert folk wanderer", brand: "amber", poseCategory: "acoustic", monthlyListeners: 420_000, followers: 190_000, fanDemographic: "28–52, americana", currentTour: "Cartography Tour", albumTitle: "Landmarks", singleTitle: "Trail", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "The Cedar Line", genre: "Folk", actType: "band", hometown: "Portland, ME", tagline: "Atlantic folk collective", aesthetic: "Maritime folk aesthetic", brand: "cyan", poseCategory: "acoustic", monthlyListeners: 380_000, followers: 170_000, fanDemographic: "26–48, folk", currentTour: "Cedar Coast", albumTitle: "Tidal Folk", singleTitle: "Harbor", manager: "James Park", status: "REHEARSAL" },
  { name: "Willow Archive", genre: "Americana", actType: "solo", hometown: "Asheville, NC", tagline: "Appalachian archive songs", aesthetic: "Handmade folk couture", brand: "emerald", poseCategory: "acoustic", monthlyListeners: 520_000, followers: 230_000, fanDemographic: "27–50, appalachian", currentTour: "Archive Live", albumTitle: "Field Notes", singleTitle: "Willow", manager: "Sarah Chen", status: "ON TOUR" },
  { name: "Open Highway", genre: "Americana", actType: "band", hometown: "Kansas City, MO", tagline: "Heartland highway anthems", aesthetic: "Road-worn americana", brand: "amber", poseCategory: "country", monthlyListeners: 640_000, followers: 290_000, fanDemographic: "25–46, heartland", currentTour: "Highway Live", albumTitle: "Mile Markers", singleTitle: "Drive", manager: "Marcus Lee", status: "LIVE" },
  { name: "Fable & Frame", genre: "Folk", actType: "duo", hometown: "Edinburgh, UK", tagline: "Celtic folk modernized", aesthetic: "Tartan folk fusion", brand: "indigo", poseCategory: "acoustic", monthlyListeners: 460_000, followers: 210_000, fanDemographic: "24–44, Celtic folk", currentTour: "Fable Tour", albumTitle: "Story Arc", singleTitle: "Tale", manager: "James Park", status: "ON TOUR" },
  { name: "Copper Canyon", genre: "Americana", actType: "solo", hometown: "Flagstaff, AZ", tagline: "Canyon echo americana", aesthetic: "Southwest copper tones", brand: "amber", poseCategory: "acoustic", monthlyListeners: 340_000, followers: 150_000, fanDemographic: "28–50, desert americana", currentTour: "Canyon Circuit", albumTitle: "Red Rock", singleTitle: "Echo", manager: "Sarah Chen", status: "IDLE" },
  { name: "Lantern Field", genre: "Folk", actType: "band", hometown: "Madison, WI", tagline: "Midwest folk luminaries", aesthetic: "Campfire-to-arena folk", brand: "emerald", poseCategory: "acoustic", monthlyListeners: 290_000, followers: 130_000, fanDemographic: "26–48, Midwest folk", currentTour: "Lantern Live", albumTitle: "Field Light", singleTitle: "Glow", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "Sage Hollow", genre: "Americana", actType: "solo", hometown: "Bozeman, MT", tagline: "Mountain sage storyteller", aesthetic: "Montana americana", brand: "slate", poseCategory: "acoustic", monthlyListeners: 360_000, followers: 160_000, fanDemographic: "27–50, mountain folk", currentTour: "Hollow Road", albumTitle: "Sage Season", singleTitle: "Trailhead", manager: "James Park", status: "LIVE" },
];

const INDIE: Seed[] = [
  { name: "Velvet Static", genre: "Indie Rock", actType: "band", hometown: "Brooklyn, NY", tagline: "Indie rock built for festival headliners", aesthetic: "Vintage amps and velvet jackets", brand: "violet", poseCategory: "indie", monthlyListeners: 1_890_000, followers: 820_000, fanDemographic: "18–34, indie rock", currentTour: "Static Circuit", albumTitle: "Feedback Bloom", singleTitle: "Hum", manager: "James Park", status: "LIVE", featured: true },
  { name: "Harbor Lights", genre: "Indie Pop", actType: "band", hometown: "San Francisco, CA", tagline: "Bay indie-pop luminaries", aesthetic: "Coastal indie aesthetic", brand: "cyan", poseCategory: "indie", monthlyListeners: 1_240_000, followers: 540_000, fanDemographic: "17–32, indie pop", currentTour: "Harbor Tour", albumTitle: "Bay Glow", singleTitle: "Tide", manager: "Sarah Chen", status: "ON TOUR" },
  { name: "Fern Circuit", genre: "Indie Rock", actType: "band", hometown: "Olympia, WA", tagline: "Shoegaze stadium act", aesthetic: "Dreamy indie layers", brand: "indigo", poseCategory: "indie", monthlyListeners: 920_000, followers: 410_000, fanDemographic: "19–36, shoegaze", currentTour: "Fern Live", albumTitle: "Green Static", singleTitle: "Moss", manager: "Marcus Lee", status: "LIVE" },
  { name: "June Paper", genre: "Indie Pop", actType: "solo", hometown: "Chicago, IL", tagline: "Indie-pop confessionals", aesthetic: "Soft indie fashion", brand: "rose", poseCategory: "indie", monthlyListeners: 780_000, followers: 350_000, fanDemographic: "18–30, indie pop", currentTour: "Paper Planes", albumTitle: "Folded Light", singleTitle: "Crease", manager: "James Park", status: "ON TOUR" },
  { name: "Orbit Sunday", genre: "Indie Pop", actType: "band", hometown: "Los Angeles, CA", tagline: "Dreamy hook specialists", aesthetic: "LA indie sun haze", brand: "amber", poseCategory: "indie", monthlyListeners: 640_000, followers: 290_000, fanDemographic: "17–31, LA indie", currentTour: "Sunday Orbit", albumTitle: "Lazy Sun", singleTitle: "Drift", manager: "Sarah Chen", status: "REHEARSAL" },
  { name: "Clementine Arc", genre: "Indie Rock", actType: "solo", hometown: "Austin, TX", tagline: "Cult following breakout", aesthetic: "Texas indie grit", brand: "amber", poseCategory: "indie", monthlyListeners: 520_000, followers: 230_000, fanDemographic: "20–35, indie rock", currentTour: "Arc Live", albumTitle: "Citrus Static", singleTitle: "Peel", manager: "Marcus Lee", status: "LIVE" },
  { name: "Velvet Yard", genre: "Indie Rock", actType: "band", hometown: "Detroit, MI", tagline: "Garage indie phenomenon", aesthetic: "Rust-belt indie", brand: "slate", poseCategory: "indie", monthlyListeners: 460_000, followers: 210_000, fanDemographic: "19–34, garage indie", currentTour: "Yard Tour", albumTitle: "Back Lot", singleTitle: "Rust", manager: "James Park", status: "ON TOUR" },
  { name: "Pilot Moon", genre: "Indie Pop", actType: "solo", hometown: "Toronto, ON", tagline: "Alt-radio favorite", aesthetic: "Canadian indie polish", brand: "cyan", poseCategory: "indie", monthlyListeners: 890_000, followers: 390_000, fanDemographic: "18–33, Canadian indie", currentTour: "Moon Pilot", albumTitle: "Orbit Pop", singleTitle: "Launch", manager: "Sarah Chen", status: "LIVE" },
  { name: "Sunday Architect", genre: "Indie Rock", actType: "solo", hometown: "Philadelphia, PA", tagline: "Slow-build anthem writer", aesthetic: "Philly indie earnest", brand: "emerald", poseCategory: "indie", monthlyListeners: 380_000, followers: 170_000, fanDemographic: "21–38, indie rock", currentTour: "Architect Live", albumTitle: "Blueprint", singleTitle: "Frame", manager: "Marcus Lee", status: "IDLE" },
  { name: "Atlas Grey", genre: "Indie Pop", actType: "solo", hometown: "Manchester, UK", tagline: "Lo-fi arena surprise", aesthetic: "UK indie bedroom-to-stage", brand: "violet", poseCategory: "indie", monthlyListeners: 720_000, followers: 320_000, fanDemographic: "18–32, UK indie", currentTour: "Grey Atlas", albumTitle: "Muted Maps", singleTitle: "Chart", manager: "James Park", status: "ON TOUR" },
];

const EDM_DJ: Seed[] = [
  { name: "Neon Atlas", genre: "Electronic Duo", actType: "duo", hometown: "Amsterdam, NL", tagline: "Festival EDM duo with visual sync", aesthetic: "Neon minimal futurism", brand: "cyan", poseCategory: "dj", monthlyListeners: 3_640_000, followers: 1_680_000, fanDemographic: "18–32, festival EDM", currentTour: "Atlas World", albumTitle: "Grid Maps", singleTitle: "Pulse", manager: "Marcus Lee", status: "LIVE", featured: true },
  { name: "Solar Echo", genre: "Electronic", actType: "solo", hometown: "Ibiza, ES", tagline: "Sunset-to-sunrise electronic", aesthetic: "Solar stage visuals", brand: "amber", poseCategory: "dj", monthlyListeners: 2_890_000, followers: 1_320_000, fanDemographic: "20–36, electronic", currentTour: "Solar Circuit", albumTitle: "Helios", singleTitle: "Ray", manager: "Sarah Chen", status: "LIVE", featured: true },
  { name: "DJ Polarity", genre: "EDM", actType: "solo", hometown: "Berlin, DE", tagline: "Bass drop scientist", aesthetic: "Techno precision wear", brand: "violet", poseCategory: "dj", monthlyListeners: 2_240_000, followers: 980_000, fanDemographic: "18–30, bass/EDM", currentTour: "Polarity Live", albumTitle: "Magnetic", singleTitle: "Flip", manager: "Marcus Lee", status: "LIVE" },
  { name: "DJ Lumenwave", genre: "House", actType: "solo", hometown: "Chicago, IL", tagline: "Sunrise set legend", aesthetic: "House music classic", brand: "cyan", poseCategory: "dj", monthlyListeners: 1_680_000, followers: 740_000, fanDemographic: "21–38, house", currentTour: "Lumen Sessions", albumTitle: "Wave Form", singleTitle: "Glow", manager: "James Park", status: "ON TOUR" },
  { name: "DJ Kinetic", genre: "EDM", actType: "solo", hometown: "Los Angeles, CA", tagline: "Peak-hour architect", aesthetic: "Festival mainstage gear", brand: "fuchsia", poseCategory: "dj", monthlyListeners: 2_120_000, followers: 920_000, fanDemographic: "18–32, mainstage EDM", currentTour: "Kinetic World", albumTitle: "Motion", singleTitle: "Velocity", manager: "Sarah Chen", status: "LIVE" },
  { name: "DJ Circuitry", genre: "Electronic", actType: "solo", hometown: "Detroit, MI", tagline: "Techno tunnel master", aesthetic: "Industrial techno", brand: "slate", poseCategory: "dj", monthlyListeners: 980_000, followers: 430_000, fanDemographic: "22–40, techno", currentTour: "Circuit Live", albumTitle: "Wire Frame", singleTitle: "Node", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "DJ Velvet Storm", genre: "House", actType: "solo", hometown: "Miami, FL", tagline: "Melodic drop curator", aesthetic: "Tropical house glam", brand: "rose", poseCategory: "dj", monthlyListeners: 1_340_000, followers: 590_000, fanDemographic: "20–35, melodic house", currentTour: "Storm Season", albumTitle: "Velvet Bass", singleTitle: "Surge", manager: "James Park", status: "LIVE" },
  { name: "DJ Arc Pulse", genre: "EDM", actType: "solo", hometown: "Las Vegas, NV", tagline: "Vegas residency staple", aesthetic: "Vegas EDM spectacle", brand: "fuchsia", poseCategory: "dj", monthlyListeners: 1_890_000, followers: 820_000, fanDemographic: "21–36, Vegas EDM", currentTour: "Arc Residency", albumTitle: "Neon Pulse", singleTitle: "Arc", manager: "Sarah Chen", status: "ON TOUR" },
  { name: "DJ Solstice", genre: "EDM", actType: "solo", hometown: "Stockholm, SE", tagline: "Emotional EDM storyteller", aesthetic: "Scandi EDM clean", brand: "cyan", poseCategory: "dj", monthlyListeners: 1_120_000, followers: 490_000, fanDemographic: "18–32, progressive EDM", currentTour: "Solstice Live", albumTitle: "Long Day", singleTitle: "Dusk", manager: "Marcus Lee", status: "REHEARSAL" },
  { name: "DJ Phantom Grid", genre: "Electronic", actType: "solo", hometown: "Tokyo, JP", tagline: "Visual-sound hybrid act", aesthetic: "Cyber J-pop electronic", brand: "indigo", poseCategory: "dj", monthlyListeners: 1_560_000, followers: 680_000, fanDemographic: "17–30, JP electronic", currentTour: "Phantom World", albumTitle: "Grid Ghost", singleTitle: "Phase", manager: "James Park", status: "LIVE" },
];

const ACOUSTIC: Seed[] = [
  { name: "Elias Finch", genre: "Singer Songwriter", actType: "solo", hometown: "Nashville, TN", tagline: "Intimate-to-arena storyteller", aesthetic: "Acoustic elegance", brand: "amber", poseCategory: "acoustic", monthlyListeners: 1_240_000, followers: 540_000, fanDemographic: "22–44, singer-songwriter", currentTour: "Finch Sessions", albumTitle: "Quiet Roads", singleTitle: "Home", manager: "Sarah Chen", status: "ON TOUR" },
  { name: "Maya Cedar", genre: "Acoustic", actType: "solo", hometown: "Boulder, CO", tagline: "Fingerstyle phenomenon", aesthetic: "Mountain acoustic", brand: "emerald", poseCategory: "acoustic", monthlyListeners: 680_000, followers: 300_000, fanDemographic: "24–48, acoustic", currentTour: "Cedar Live", albumTitle: "Wood & Wire", singleTitle: "Root", manager: "James Park", status: "LIVE" },
  { name: "Noah Bridge", genre: "Singer Songwriter", actType: "solo", hometown: "Portland, OR", tagline: "Campfire-to-stadium arc", aesthetic: "Pacific northwest acoustic", brand: "cyan", poseCategory: "acoustic", monthlyListeners: 920_000, followers: 410_000, fanDemographic: "20–40, acoustic pop", currentTour: "Bridge Tour", albumTitle: "Span", singleTitle: "Cross", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "Iris Haven", genre: "Acoustic", actType: "solo", hometown: "Savannah, GA", tagline: "Soulful acoustic balladeer", aesthetic: "Southern acoustic grace", brand: "rose", poseCategory: "acoustic", monthlyListeners: 520_000, followers: 230_000, fanDemographic: "23–46, acoustic soul", currentTour: "Haven Live", albumTitle: "Safe Harbor", singleTitle: "Anchor", manager: "Sarah Chen", status: "LIVE" },
  { name: "Cole Wander", genre: "Singer Songwriter", actType: "solo", hometown: "Austin, TX", tagline: "Road-worn troubadour", aesthetic: "Texas troubadour", brand: "amber", poseCategory: "acoustic", monthlyListeners: 460_000, followers: 210_000, fanDemographic: "25–50, troubadour", currentTour: "Wander Road", albumTitle: "Mile Songs", singleTitle: "Dust", manager: "James Park", status: "REHEARSAL" },
  { name: "Sage Monroe", genre: "Acoustic", actType: "solo", hometown: "Seattle, WA", tagline: "Unplugged arena favorite", aesthetic: "PNW acoustic polish", brand: "emerald", poseCategory: "acoustic", monthlyListeners: 780_000, followers: 350_000, fanDemographic: "22–42, unplugged", currentTour: "Monroe Unplugged", albumTitle: "Soft Power", singleTitle: "Still", manager: "Marcus Lee", status: "ON TOUR" },
  { name: "Linnea Shore", genre: "Singer Songwriter", actType: "solo", hometown: "Halifax, NS", tagline: "Coastal acoustic poet", aesthetic: "Atlantic acoustic", brand: "cyan", poseCategory: "acoustic", monthlyListeners: 340_000, followers: 150_000, fanDemographic: "24–48, coastal folk", currentTour: "Shore Lines", albumTitle: "Tidal Poems", singleTitle: "Salt", manager: "Sarah Chen", status: "LIVE" },
  { name: "Arlen Pike", genre: "Acoustic", actType: "solo", hometown: "Nashville, TN", tagline: "Story-song craftsman", aesthetic: "Classic Nashville acoustic", brand: "amber", poseCategory: "acoustic", monthlyListeners: 420_000, followers: 190_000, fanDemographic: "26–50, country-acoustic", currentTour: "Pike Sessions", albumTitle: "Carved", singleTitle: "Grain", manager: "James Park", status: "ON TOUR" },
  { name: "Ruth Emerald", genre: "Singer Songwriter", actType: "solo", hometown: "London, UK", tagline: "Piano-led confessionals", aesthetic: "UK piano pop acoustic", brand: "violet", poseCategory: "acoustic", monthlyListeners: 890_000, followers: 390_000, fanDemographic: "20–38, piano pop", currentTour: "Emerald Keys", albumTitle: "Green Room", singleTitle: "Ivory", manager: "Marcus Lee", status: "LIVE" },
  { name: "Tommy Reverie", genre: "Acoustic", actType: "solo", hometown: "Dublin, IE", tagline: "Stadium unplugged specialist", aesthetic: "Irish acoustic arena", brand: "indigo", poseCategory: "acoustic", monthlyListeners: 640_000, followers: 290_000, fanDemographic: "22–44, Irish acoustic", currentTour: "Reverie Unplugged", albumTitle: "Quiet Storm", singleTitle: "Lull", manager: "Sarah Chen", status: "IDLE" },
];

const MIXED: Seed[] = [
  { name: "Afro Circuit", genre: "Afrobeats", actType: "solo", hometown: "Lagos, NG", tagline: "Afrobeats arena pioneer", aesthetic: "Afro-futurist stage", brand: "amber", poseCategory: "hip-hop", monthlyListeners: 4_120_000, followers: 1_890_000, fanDemographic: "16–34, Afrobeats global", currentTour: "Circuit Africa", albumTitle: "Pulse Lagos", singleTitle: "Jollof", manager: "Marcus Lee", status: "LIVE" },
  { name: "Blue Note Society", genre: "Jazz", actType: "band", hometown: "New Orleans, LA", tagline: "Jazz for the digital arena", aesthetic: "Classic jazz modern stage", brand: "indigo", poseCategory: "acoustic", monthlyListeners: 420_000, followers: 190_000, fanDemographic: "28–55, jazz", currentTour: "Blue Note Live", albumTitle: "Digital Standards", singleTitle: "Improv", manager: "James Park", status: "ON TOUR" },
  { name: "Delta Kings", genre: "Blues", actType: "band", hometown: "Clarksdale, MS", tagline: "Blues heritage, arena scale", aesthetic: "Delta blues formal", brand: "slate", poseCategory: "acoustic", monthlyListeners: 380_000, followers: 170_000, fanDemographic: "30–58, blues", currentTour: "Delta Circuit", albumTitle: "Crossroads", singleTitle: "Highway", manager: "Sarah Chen", status: "LIVE" },
  { name: "Pulse Collective", genre: "Pop/R&B", actType: "group", hometown: "Toronto, ON", tagline: "Global pop-R&B hybrid", aesthetic: "Matching urban couture", brand: "fuchsia", poseCategory: "rnb", monthlyListeners: 1_680_000, followers: 740_000, fanDemographic: "16–30, pop-R&B global", currentTour: "Pulse World", albumTitle: "Sync", singleTitle: "Beat", manager: "Marcus Lee", status: "LIVE" },
  { name: "Voltage Youth", genre: "Punk", actType: "band", hometown: "Los Angeles, CA", tagline: "Gen-Z punk breakout", aesthetic: "Neon punk DIY", brand: "rose", poseCategory: "rock-band", monthlyListeners: 640_000, followers: 290_000, fanDemographic: "16–26, punk", currentTour: "Youth Voltage", albumTitle: "Static Age", singleTitle: "Riot", manager: "James Park", status: "ON TOUR" },
  { name: "Horizon Jazz Club", genre: "Jazz", actType: "band", hometown: "New York, NY", tagline: "Manhattan jazz modernists", aesthetic: "Jazz club to arena", brand: "indigo", poseCategory: "acoustic", monthlyListeners: 290_000, followers: 130_000, fanDemographic: "28–52, NYC jazz", currentTour: "Horizon Live", albumTitle: "Skyline Jazz", singleTitle: "Uptown", manager: "Sarah Chen", status: "REHEARSAL" },
  { name: "Meridian Sound", genre: "Electronic Duo", actType: "duo", hometown: "Paris, FR", tagline: "French touch electronic duo", aesthetic: "Parisian electronic chic", brand: "violet", poseCategory: "dj", monthlyListeners: 1_120_000, followers: 490_000, fanDemographic: "20–36, French electronic", currentTour: "Meridian Live", albumTitle: "Ligne", singleTitle: "Metro", manager: "Marcus Lee", status: "LIVE" },
  { name: "Coastal Blues", genre: "Blues", actType: "solo", hometown: "Charleston, SC", tagline: "Coastal blues storyteller", aesthetic: "Southern blues ease", brand: "cyan", poseCategory: "acoustic", monthlyListeners: 260_000, followers: 120_000, fanDemographic: "30–54, coastal blues", currentTour: "Coastal Live", albumTitle: "Tide Blues", singleTitle: "Current", manager: "James Park", status: "ON TOUR" },
  { name: "Global Rhythm", genre: "Afrobeats", actType: "group", hometown: "Accra, GH", tagline: "Pan-African rhythm collective", aesthetic: "Afro-global stage wear", brand: "emerald", poseCategory: "hip-hop", monthlyListeners: 2_240_000, followers: 980_000, fanDemographic: "17–34, Afrobeats diaspora", currentTour: "Rhythm World", albumTitle: "Continental", singleTitle: "Unity", manager: "Sarah Chen", status: "LIVE" },
  { name: "The Prism Society", genre: "Alternative Pop", actType: "band", hometown: "San Francisco, CA", tagline: "Art-pop collective", aesthetic: "Prismatic stage design", brand: "fuchsia", poseCategory: "indie", monthlyListeners: 780_000, followers: 350_000, fanDemographic: "18–32, art pop", currentTour: "Prism Live", albumTitle: "Refraction", singleTitle: "Light", manager: "Marcus Lee", status: "IDLE" },
];

export const LIVECIRCUIT_ORIGINALS: OriginalsArtist[] = [
  ...build("pop", POP),
  ...build("rnb-solo", RNB_SOLO),
  ...build("rnb-group", RNB_GROUP),
  ...build("hip-hop", HIP_HOP),
  ...build("rock", ROCK),
  ...build("alternative", ALTERNATIVE),
  ...build("country", COUNTRY),
  ...build("americana-folk", AMERICANA_FOLK),
  ...build("indie", INDIE),
  ...build("edm-dj", EDM_DJ),
  ...build("acoustic", ACOUSTIC),
  ...build("mixed", MIXED),
];

/** Primary artist identity for the Artist Demo — Nova Lane */
export const PRIMARY_ARTIST_DEMO_ID = "nova-lane";

/** Default headliner when fan enters any arena */
export const DEFAULT_FAN_HEADLINER_ID = "nova-lane";

/** Featured spotlight rotation for homepage */
export const FEATURED_ORIGINALS_IDS = [
  "nova-lane",
  "echo-drive",
  "neon-atlas",
  "the-wild-pines",
  "rebel-phase",
  "velvet-static",
  "kings-roses",
  "midnight-saints",
] as const;
