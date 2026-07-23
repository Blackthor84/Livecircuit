import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import type {
  FestivalDetail,
  FestivalLeaderboardRow,
  FestivalStatus,
  FestivalSummary,
  FestivalsHubReport,
} from "@/lib/types/virtual-festivals";

function firstJoin<T extends Record<string, unknown>>(value: T | T[] | null | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function resolveFestivalStatus(
  row: { status: string; starts_at: string; ends_at: string },
  now = Date.now()
): FestivalStatus {
  const start = new Date(row.starts_at).getTime();
  const end = new Date(row.ends_at).getTime();
  if (row.status === "archived" || row.status === "ended") return row.status as FestivalStatus;
  if (now < start) return "scheduled";
  if (now > end) return "ended";
  if (row.status === "live") return "live";
  return "live";
}

export async function refreshFestivalLeaderboard(supabase: SupabaseClient, festivalId: string) {
  const { data: passRows } = await supabase
    .from("festival_pass_purchases")
    .select("user_id, tier_id, festival_pass_tiers(is_vip_upgrade)")
    .eq("festival_id", festivalId)
    .eq("status", "paid");

  const pointsByUser = new Map<string, number>();
  for (const row of passRows ?? []) {
    const uid = row.user_id as string;
    const tier = firstJoin(
      row.festival_pass_tiers as Record<string, unknown> | Record<string, unknown>[] | null
    );
    const base = 100;
    const vipBonus = tier?.is_vip_upgrade ? 250 : 0;
    pointsByUser.set(uid, (pointsByUser.get(uid) ?? 0) + base + vipBonus);
  }

  const { data: collectibleRows } = await supabase
    .from("festival_collectibles")
    .select("id")
    .eq("festival_id", festivalId);

  const collectibleIds = (collectibleRows ?? []).map((c) => c.id as string);
  if (collectibleIds.length) {
    const { data: earnedCollectibles } = await supabase
      .from("user_festival_collectibles")
      .select("user_id")
      .in("collectible_id", collectibleIds);

    for (const row of earnedCollectibles ?? []) {
      const uid = row.user_id as string;
      pointsByUser.set(uid, (pointsByUser.get(uid) ?? 0) + 40);
    }
  }

  const sorted = [...pointsByUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50);

  if (!sorted.length) return [];

  const userIds = sorted.map(([id]) => id);
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
  const names = new Map((profiles ?? []).map((p) => [p.id as string, (p.display_name as string) ?? "Fan"]));

  await supabase.from("festival_leaderboard_entries").delete().eq("festival_id", festivalId);

  const entries = sorted.map(([userId, points], index) => ({
    festival_id: festivalId,
    user_id: userId,
    points,
    rank: index + 1,
    display_name: names.get(userId) ?? "Fan",
  }));

  await supabase.from("festival_leaderboard_entries").insert(entries);

  return entries.map((e) => ({
    rank: e.rank,
    userId: e.user_id,
    displayName: e.display_name,
    points: e.points,
  })) satisfies FestivalLeaderboardRow[];
}

export async function grantFestivalPassRewards(
  supabase: SupabaseClient,
  userId: string,
  festivalId: string,
  tierId: string,
  isVip: boolean
) {
  const { data: collectibles } = await supabase
    .from("festival_collectibles")
    .select("id, slug")
    .eq("festival_id", festivalId);

  const toGrant = (collectibles ?? []).filter((c) => {
    if (c.slug === "solar-pin") return true;
    if (c.slug === "vip-lanyard") return isVip;
    return false;
  });

  if (toGrant.length) {
    await supabase.from("user_festival_collectibles").upsert(
      toGrant.map((c) => ({ user_id: userId, collectible_id: c.id })),
      { onConflict: "user_id,collectible_id", ignoreDuplicates: true }
    );
  }

  const { data: achievements } = await supabase
    .from("festival_achievement_defs")
    .select("id, slug, criteria")
    .eq("festival_id", festivalId);

  const earnedSlugs = new Set<string>(["pass-holder"]);
  if (isVip) earnedSlugs.add("vip-insider");

  const toAchieve = (achievements ?? []).filter((a) => earnedSlugs.has(a.slug as string));
  if (toAchieve.length) {
    await supabase.from("user_festival_achievements").upsert(
      toAchieve.map((a) => ({ user_id: userId, achievement_id: a.id })),
      { onConflict: "user_id,achievement_id", ignoreDuplicates: true }
    );
  }

  void tierId;
}

export async function listFestivalsHub(supabase: SupabaseClient): Promise<FestivalsHubReport> {
  const { data: rows } = await supabase
    .from("virtual_festivals")
    .select("id, slug, name, tagline, status, starts_at, ends_at, banner_icon, festival_venues(venue_id)")
    .order("starts_at", { ascending: true });

  const summaries: FestivalSummary[] = (rows ?? []).map((row) => {
    const venues = row.festival_venues as { venue_id: string }[] | null;
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      tagline: (row.tagline as string) ?? null,
      status: resolveFestivalStatus({
        status: row.status as string,
        starts_at: row.starts_at as string,
        ends_at: row.ends_at as string,
      }),
      startsAt: row.starts_at as string,
      endsAt: row.ends_at as string,
      bannerIcon: (row.banner_icon as string) ?? null,
      venueCount: venues?.length ?? 0,
    };
  });

  return {
    live: summaries.filter((s) => s.status === "live"),
    upcoming: summaries.filter((s) => s.status === "scheduled"),
    past: summaries.filter((s) => s.status === "ended" || s.status === "archived"),
    computedAt: new Date().toISOString(),
  };
}

export async function getFestivalBySlug(supabase: SupabaseClient, slug: string) {
  const { data } = await supabase
    .from("virtual_festivals")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function buildFestivalDetail(
  supabase: SupabaseClient,
  slug: string,
  userId: string | null
): Promise<FestivalDetail | null> {
  const row = await getFestivalBySlug(supabase, slug);
  if (!row) return null;

  const festivalId = row.id as string;
  const status = resolveFestivalStatus({
    status: row.status as string,
    starts_at: row.starts_at as string,
    ends_at: row.ends_at as string,
  });

  const { count: venueCount } = await supabase
    .from("festival_venues")
    .select("*", { count: "exact", head: true })
    .eq("festival_id", festivalId);

  const summary: FestivalSummary = {
    id: festivalId,
    slug: row.slug as string,
    name: row.name as string,
    tagline: (row.tagline as string) ?? null,
    status,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    bannerIcon: (row.banner_icon as string) ?? null,
    venueCount: venueCount ?? 0,
  };

  const { data: mapRows } = await supabase
    .from("festival_venues")
    .select("map_x, map_y, map_label, venues(slug, name)")
    .eq("festival_id", festivalId);

  const { data: slotRows } = await supabase
    .from("festival_slots")
    .select(
      `id, title, slot_type, starts_at, ends_at, is_vip_only,
      festival_days(label),
      venues(slug, name),
      artists(slug, stage_name),
      events(slug)`
    )
    .eq("festival_id", festivalId)
    .order("starts_at", { ascending: true });

  const { data: tierRows } = await supabase
    .from("festival_pass_tiers")
    .select("*")
    .eq("festival_id", festivalId)
    .order("sort_order", { ascending: true });

  let ownedTierIds = new Set<string>();
  if (userId) {
    const { data: owned } = await supabase
      .from("festival_pass_purchases")
      .select("tier_id")
      .eq("festival_id", festivalId)
      .eq("user_id", userId)
      .eq("status", "paid");
    ownedTierIds = new Set((owned ?? []).map((o) => o.tier_id as string));
  }

  const { data: collectibleRows } = await supabase
    .from("festival_collectibles")
    .select("*")
    .eq("festival_id", festivalId)
    .order("sort_order", { ascending: true });

  const earnedCollectibleIds = new Set<string>();
  if (userId && collectibleRows?.length) {
    const { data: earned } = await supabase
      .from("user_festival_collectibles")
      .select("collectible_id")
      .eq("user_id", userId)
      .in(
        "collectible_id",
        collectibleRows.map((c) => c.id as string)
      );
    for (const e of earned ?? []) earnedCollectibleIds.add(e.collectible_id as string);
  }

  const { data: achievementRows } = await supabase
    .from("festival_achievement_defs")
    .select("*")
    .eq("festival_id", festivalId)
    .order("sort_order", { ascending: true });

  const earnedAchievementIds = new Set<string>();
  if (userId && achievementRows?.length) {
    const { data: earnedA } = await supabase
      .from("user_festival_achievements")
      .select("achievement_id")
      .eq("user_id", userId)
      .in(
        "achievement_id",
        achievementRows.map((a) => a.id as string)
      );
    for (const e of earnedA ?? []) earnedAchievementIds.add(e.achievement_id as string);
  }

  const admin = isSupabaseConfigured() ? getSupabaseAdmin() : supabase;
  await refreshFestivalLeaderboard(admin, festivalId);

  const { data: board } = await supabase
    .from("festival_leaderboard_entries")
    .select("rank, user_id, points, display_name")
    .eq("festival_id", festivalId)
    .order("rank", { ascending: true })
    .limit(25);

  let userPoints: number | null = null;
  if (userId) {
    const mine = (board ?? []).find((r) => r.user_id === userId);
    userPoints = (mine?.points as number) ?? null;
  }

  return {
    ...summary,
    description: (row.description as string) ?? null,
    mapPins: (mapRows ?? []).map((pin) => {
      const venue = firstJoin(pin.venues as Record<string, unknown> | Record<string, unknown>[]);
      return {
        venueSlug: (venue?.slug as string) ?? "",
        venueName: (venue?.name as string) ?? "Venue",
        label: (pin.map_label as string) ?? null,
        mapX: Number(pin.map_x),
        mapY: Number(pin.map_y),
      };
    }),
    schedule: (slotRows ?? []).map((slot) => {
      const day = firstJoin(slot.festival_days as Record<string, unknown> | Record<string, unknown>[]);
      const venue = firstJoin(slot.venues as Record<string, unknown> | Record<string, unknown>[]);
      const artist = firstJoin(slot.artists as Record<string, unknown> | Record<string, unknown>[]);
      const event = firstJoin(slot.events as Record<string, unknown> | Record<string, unknown>[]);
      return {
        id: slot.id as string,
        title: slot.title as string,
        slotType: slot.slot_type as "performance" | "meet_greet",
        startsAt: slot.starts_at as string,
        endsAt: slot.ends_at as string,
        isVipOnly: Boolean(slot.is_vip_only),
        venueSlug: (venue?.slug as string) ?? null,
        venueName: (venue?.name as string) ?? null,
        artistSlug: (artist?.slug as string) ?? null,
        artistName: (artist?.stage_name as string) ?? null,
        eventSlug: (event?.slug as string) ?? null,
        dayLabel: (day?.label as string) ?? "Festival day",
      };
    }),
    passTiers: (tierRows ?? []).map((t) => ({
      id: t.id as string,
      slug: t.slug as string,
      name: t.name as string,
      description: (t.description as string) ?? null,
      priceCents: t.price_cents as number,
      isVipUpgrade: Boolean(t.is_vip_upgrade),
      perks: (t.perks as string[]) ?? [],
      owned: ownedTierIds.has(t.id as string),
    })),
    collectibles: (collectibleRows ?? []).map((c) => ({
      id: c.id as string,
      slug: c.slug as string,
      name: c.name as string,
      description: (c.description as string) ?? null,
      rarity: c.rarity as string,
      earned: earnedCollectibleIds.has(c.id as string),
    })),
    achievements: (achievementRows ?? []).map((a) => ({
      id: a.id as string,
      slug: a.slug as string,
      name: a.name as string,
      description: a.description as string,
      earned: earnedAchievementIds.has(a.id as string),
    })),
    leaderboard: (board ?? []).map((r) => ({
      rank: r.rank as number,
      userId: r.user_id as string,
      displayName: (r.display_name as string) ?? "Fan",
      points: r.points as number,
      isYou: userId ? r.user_id === userId : false,
    })),
    userPoints,
  };
}

export async function recordFestivalPassPurchase(
  supabase: SupabaseClient,
  userId: string,
  tierId: string,
  orderId: string | null
) {
  const { data: tier } = await supabase
    .from("festival_pass_tiers")
    .select("id, festival_id, is_vip_upgrade")
    .eq("id", tierId)
    .maybeSingle();

  if (!tier) return { ok: false as const, error: "Unknown pass tier" };

  const { error } = await supabase.from("festival_pass_purchases").upsert(
    {
      user_id: userId,
      tier_id: tierId,
      festival_id: tier.festival_id as string,
      order_id: orderId,
      status: "paid",
    },
    { onConflict: "user_id,tier_id" }
  );

  if (error) return { ok: false as const, error: error.message };

  await grantFestivalPassRewards(
    supabase,
    userId,
    tier.festival_id as string,
    tierId,
    Boolean(tier.is_vip_upgrade)
  );

  return { ok: true as const, festivalId: tier.festival_id as string };
}
