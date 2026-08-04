/** Demo-specific derived content from Artist Bible (never random artists) */
import type { DemoArtistEntry } from "@/data/demo/artists/types";
import { getAgencyRoster, getArtistById, getPrimaryDemoArtist } from "@/data/demo/artists/queries";

export function getFanChatMessages(artist: DemoArtistEntry) {
  return [
    { user: "alex_bos", message: `${artist.stageName} IS UNREAL`, emoji: "🔥" },
    { user: "neon_fan", message: `${artist.currentTour.name} visuals are insane`, emoji: "✨" },
    { user: "vip_luna", message: "Front row hits different", emoji: "💜" },
    { user: "circuit_47", message: `Best ${artist.genre} show I've ever seen`, emoji: "❤️" },
    { user: "glow_kid", message: "ENCORE!!!", emoji: "👏" },
    { user: "tip_master", message: `Just tipped during ${artist.singleTitle}`, emoji: "💸" },
    { user: "merch_queen", message: `Copped the ${artist.currentTour.name} tee`, emoji: "👕" },
    { user: "superfan_99", message: `${artist.stageName} forever`, emoji: "⭐" },
  ];
}

export function getArtistChatMessages(artist: DemoArtistEntry) {
  return [
    { user: "superfan_99", message: "YOU'RE KILLING IT" },
    { user: "vip_room", message: "VIP lounge is packed" },
    { user: "request_bot", message: `Song request: ${artist.singleTitle}` },
    { user: "tour_crew", message: `${artist.currentTour.upcomingShows[1]?.city ?? "Next city"} sold 80% already` },
  ];
}

export function getFanMerchForDemo(artist: DemoArtistEntry) {
  return artist.merchCollection.map((m) => ({ id: m.id, name: m.name, price: m.price }));
}

export function getAgencyNotifications() {
  const roster = getAgencyRoster(6);
  return [
    { id: "n1", type: "contract", text: `${roster[0]?.name ?? "Artist"} — contract renews in 14 days`, time: "2m ago" },
    { id: "n2", type: "live", text: `${roster[1]?.name ?? "Artist"} crossed $${Math.round((roster[1]?.revenue ?? 40000) / 1000)}K revenue tonight`, time: "8m ago" },
    { id: "n3", type: "tour", text: `${roster[2]?.name ?? "Artist"} added Dallas to ${getArtistById(roster[2]?.id ?? "")?.currentTour.name ?? "tour"}`, time: "22m ago" },
    { id: "n4", type: "alert", text: `${roster[3]?.name ?? "Artist"} VIP lounge at 94% capacity`, time: "35m ago" },
  ];
}

export function getArtistLiveStats(artist: DemoArtistEntry) {
  return {
    audience: artist.liveAudience,
    tips: Math.round(artist.revenueTonight * 0.15),
    followersGained: Math.round(artist.followers * 0.009),
    merchSales: Math.round(artist.merchRevenue / 100),
    vipMembers: Math.round(artist.liveAudience * 0.07),
    capacity: Math.round(artist.liveAudience * 1.12),
    revenueTonight: artist.revenueTonight,
    encoreRequests: Math.round(artist.liveAudience * 0.18),
  };
}

export function getLiveNotifications(artist: DemoArtistEntry) {
  return [
    { type: "tip", text: "+ New Tip · $20", icon: "Sparkles" },
    { type: "vip", text: "+ VIP Joined", icon: "Users" },
    { type: "follow", text: `+ 47 New Followers for ${artist.stageName}`, icon: "Users" },
    { type: "merch", text: `+ ${artist.merchCollection[0]?.name ?? "Merch"} Sold`, icon: "Gift" },
    { type: "encore", text: "+ Encore Requested", icon: "Zap" },
    { type: "request", text: `+ Song Request: ${artist.singleTitle}`, icon: "Music" },
  ];
}

export { getPrimaryDemoArtist };
