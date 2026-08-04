import type { AgencyRosterEntry, OriginalsArtist } from "@/lib/demo/originals/types";
import {
  DEFAULT_FAN_HEADLINER_ID,
  FEATURED_ORIGINALS_IDS,
  LIVECIRCUIT_ORIGINALS,
  PRIMARY_ARTIST_DEMO_ID,
} from "@/lib/demo/originals/roster-data";

export function getOriginalById(id: string): OriginalsArtist | undefined {
  return LIVECIRCUIT_ORIGINALS.find((a) => a.id === id);
}

export function getOriginalBySlug(slug: string): OriginalsArtist | undefined {
  return LIVECIRCUIT_ORIGINALS.find((a) => a.slug === slug);
}

export function getPrimaryDemoArtist(): OriginalsArtist {
  return getOriginalById(PRIMARY_ARTIST_DEMO_ID) ?? LIVECIRCUIT_ORIGINALS[0]!;
}

export function getDefaultFanHeadliner(): OriginalsArtist {
  return getOriginalById(DEFAULT_FAN_HEADLINER_ID) ?? LIVECIRCUIT_ORIGINALS[0]!;
}

export function getFeaturedOriginals(): OriginalsArtist[] {
  return FEATURED_ORIGINALS_IDS.map((id) => getOriginalById(id)).filter(Boolean) as OriginalsArtist[];
}

export function getAgencyRoster(limit = 12): AgencyRosterEntry[] {
  const priority = ["LIVE", "ON TOUR", "REHEARSAL", "IDLE"] as const;
  return [...LIVECIRCUIT_ORIGINALS]
    .sort((a, b) => priority.indexOf(a.status) - priority.indexOf(b.status) || b.followers - a.followers)
    .slice(0, limit)
    .map((a) => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      genre: a.genre,
      show: a.upcomingDates[0]?.venue ?? "LiveCircuit Arena",
      manager: a.manager,
      liveAudience: a.liveAudience,
      revenue: a.revenueTonight,
      followers: a.followers,
      shows: a.showsScheduled,
      merch: a.merchSalesTonight,
      status: a.status,
      color: a.brand.gradient,
      growth: a.growthPct,
    }));
}

export function getFanChatMessages(artist: OriginalsArtist) {
  return [
    { user: "alex_bos", message: `${artist.name} IS UNREAL`, emoji: "🔥" },
    { user: "neon_fan", message: `${artist.currentTour} visuals are insane`, emoji: "✨" },
    { user: "vip_luna", message: "Front row hits different", emoji: "💜" },
    { user: "circuit_47", message: `Best ${artist.genre} show I've ever seen`, emoji: "❤️" },
    { user: "glow_kid", message: "ENCORE!!!", emoji: "👏" },
    { user: "tip_master", message: `Just tipped during ${artist.singleTitle}`, emoji: "💸" },
    { user: "merch_queen", message: `Copped the ${artist.currentTour} tee`, emoji: "👕" },
    { user: "superfan_99", message: `${artist.name} forever`, emoji: "⭐" },
  ];
}

export function getArtistChatMessages(artist: OriginalsArtist) {
  return [
    { user: "superfan_99", message: "YOU'RE KILLING IT" },
    { user: "vip_room", message: "VIP lounge is packed" },
    { user: "request_bot", message: `Song request: ${artist.singleTitle}` },
    { user: "tour_crew", message: `${artist.upcomingDates[1]?.city ?? "Next city"} sold 80% already` },
  ];
}

export function getFanMerch(artist: OriginalsArtist) {
  return artist.merch;
}

export function getAgencyNotifications() {
  const roster = getAgencyRoster(6);
  return [
    { id: "n1", type: "contract", text: `${roster[0]?.name ?? "Artist"} — contract renews in 14 days`, time: "2m ago" },
    { id: "n2", type: "live", text: `${roster[1]?.name ?? "Artist"} crossed $${Math.round((roster[1]?.revenue ?? 40000) / 1000)}K revenue tonight`, time: "8m ago" },
    { id: "n3", type: "tour", text: `${roster[2]?.name ?? "Artist"} added Dallas to ${getOriginalById(roster[2]?.id ?? "")?.currentTour ?? "tour"}`, time: "22m ago" },
    { id: "n4", type: "alert", text: `${roster[3]?.name ?? "Artist"} VIP lounge at 94% capacity`, time: "35m ago" },
  ];
}

export function getArtistLiveStats(artist: OriginalsArtist) {
  return {
    audience: artist.liveAudience,
    tips: Math.round(artist.revenueTonight * 0.15),
    followersGained: Math.round(artist.followers * 0.009),
    merchSales: artist.merchSalesTonight,
    vipMembers: Math.round(artist.liveAudience * 0.07),
    capacity: Math.round(artist.liveAudience * 1.12),
    revenueTonight: artist.revenueTonight,
    encoreRequests: Math.round(artist.liveAudience * 0.18),
  };
}

export function pickRandomOriginal(): OriginalsArtist {
  return LIVECIRCUIT_ORIGINALS[Math.floor(Math.random() * LIVECIRCUIT_ORIGINALS.length)]!;
}

export function getVenueHeadliner(venueIndex: number): OriginalsArtist {
  const featured = getFeaturedOriginals();
  return featured[venueIndex % featured.length] ?? getDefaultFanHeadliner();
}

export function getLiveNotifications(artist: OriginalsArtist) {
  return [
    { type: "tip", text: "+ New Tip · $20", icon: "Sparkles" },
    { type: "vip", text: "+ VIP Joined", icon: "Users" },
    { type: "follow", text: `+ 47 New Followers for ${artist.name}`, icon: "Users" },
    { type: "merch", text: `+ ${artist.merch[0]?.name ?? "Merch"} Sold`, icon: "Gift" },
    { type: "encore", text: "+ Encore Requested", icon: "Zap" },
    { type: "request", text: `+ Song Request: ${artist.singleTitle}`, icon: "Music" },
  ];
}
