import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BackstageArtistAnalytics,
  BackstageArtistHub,
  BackstageCollectible,
  BackstageMemberView,
  BackstagePassPage,
  BackstagePassPlan,
} from "@/lib/types/backstage-pass";

function mapPlan(row: Record<string, unknown>): BackstagePassPlan {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    priceCentsMonthly: row.price_cents_monthly as number,
    perks: (row.perks as string[]) ?? [],
    discordUrl: (row.discord_url as string) ?? null,
    earlyTicketHours: row.early_ticket_hours as number,
    isActive: Boolean(row.is_active),
  };
}

export async function getActiveBackstageSubscription(
  supabase: SupabaseClient,
  userId: string,
  artistId: string
) {
  const { data } = await supabase
    .from("backstage_subscriptions")
    .select("id, status, current_period_end, plan_id")
    .eq("user_id", userId)
    .eq("artist_id", artistId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (!data) return null;
  if (data.current_period_end && new Date(data.current_period_end as string).getTime() < Date.now()) {
    return null;
  }
  return data;
}

export async function userHasBackstageAccess(
  supabase: SupabaseClient,
  userId: string,
  artistId: string
) {
  const sub = await getActiveBackstageSubscription(supabase, userId, artistId);
  return Boolean(sub);
}

export async function activateBackstageSubscription(
  supabase: SupabaseClient,
  input: {
    userId: string;
    planId: string;
    stripeSubscriptionId: string | null;
    stripeCustomerId: string | null;
    currentPeriodEnd: string | null;
  }
) {
  const { data: plan } = await supabase
    .from("backstage_pass_plans")
    .select("id, artist_id")
    .eq("id", input.planId)
    .maybeSingle();

  if (!plan) return { ok: false as const, error: "Plan not found" };

  await supabase.from("backstage_subscriptions").upsert(
    {
      user_id: input.userId,
      artist_id: plan.artist_id as string,
      plan_id: input.planId,
      status: "active",
      stripe_subscription_id: input.stripeSubscriptionId,
      stripe_customer_id: input.stripeCustomerId,
      current_period_end: input.currentPeriodEnd,
      canceled_at: null,
    },
    { onConflict: "user_id,artist_id" }
  );

  await supabase.from("vip_memberships").upsert(
    {
      user_id: input.userId,
      artist_id: plan.artist_id as string,
      price_cents: 0,
      active: true,
      expires_at: input.currentPeriodEnd,
    },
    { onConflict: "user_id,artist_id" }
  );

  const { data: collectibles } = await supabase
    .from("backstage_collectibles")
    .select("id")
    .eq("plan_id", input.planId);

  if (collectibles?.length) {
    await supabase.from("user_backstage_collectibles").upsert(
      collectibles.map((c) => ({ user_id: input.userId, collectible_id: c.id })),
      { onConflict: "user_id,collectible_id", ignoreDuplicates: true }
    );
  }

  return { ok: true as const, artistId: plan.artist_id as string };
}

export async function updateBackstageSubscriptionFromStripe(
  supabase: SupabaseClient,
  stripeSubscriptionId: string,
  patch: {
    status: "active" | "past_due" | "canceled" | "trialing";
    currentPeriodEnd: string | null;
  }
) {
  const { data: sub } = await supabase
    .from("backstage_subscriptions")
    .select("user_id, artist_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (!sub) return;

  await supabase
    .from("backstage_subscriptions")
    .update({
      status: patch.status,
      current_period_end: patch.currentPeriodEnd,
      canceled_at: patch.status === "canceled" ? new Date().toISOString() : null,
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  await supabase
    .from("vip_memberships")
    .update({
      active: patch.status === "active" || patch.status === "trialing",
      expires_at: patch.currentPeriodEnd,
    })
    .eq("user_id", sub.user_id as string)
    .eq("artist_id", sub.artist_id as string);
}

async function loadMemberView(
  supabase: SupabaseClient,
  userId: string | null,
  artistId: string,
  plan: BackstagePassPlan | null
): Promise<BackstageMemberView | null> {
  if (!userId || !plan) return null;

  const sub = await getActiveBackstageSubscription(supabase, userId, artistId);

  const { data: collectibles } = await supabase
    .from("backstage_collectibles")
    .select("id, slug, name, description")
    .eq("plan_id", plan.id)
    .order("sort_order", { ascending: true });

  let earned = new Set<string>();
  if (collectibles?.length) {
    const { data: earnedRows } = await supabase
      .from("user_backstage_collectibles")
      .select("collectible_id")
      .eq("user_id", userId)
      .in(
        "collectible_id",
        collectibles.map((c) => c.id as string)
      );
    earned = new Set((earnedRows ?? []).map((r) => r.collectible_id as string));
  }

  return {
    isMember: Boolean(sub),
    subscriptionStatus: sub ? (sub.status as BackstageMemberView["subscriptionStatus"]) : null,
    currentPeriodEnd: (sub?.current_period_end as string) ?? null,
    discordUrl: sub ? plan.discordUrl : null,
    collectibles: (collectibles ?? []).map(
      (c) =>
        ({
          id: c.id as string,
          slug: c.slug as string,
          name: c.name as string,
          description: (c.description as string) ?? null,
          earned: earned.has(c.id as string),
        }) satisfies BackstageCollectible
    ),
  };
}

export async function buildBackstagePassPage(
  supabase: SupabaseClient,
  artistSlug: string,
  userId: string | null
): Promise<BackstagePassPage | null> {
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug, stage_name, user_id")
    .eq("slug", artistSlug)
    .maybeSingle();

  if (!artist) return null;

  const { data: planRow } = await supabase
    .from("backstage_pass_plans")
    .select("*")
    .eq("artist_id", artist.id as string)
    .eq("slug", "backstage")
    .eq("is_active", true)
    .maybeSingle();

  const plan = planRow ? mapPlan(planRow as Record<string, unknown>) : null;

  const { data: announcements } = await supabase
    .from("backstage_announcements")
    .select("id, title, body, members_only, published_at")
    .eq("artist_id", artist.id as string)
    .order("published_at", { ascending: false })
    .limit(10);

  const isMember = userId ? await userHasBackstageAccess(supabase, userId, artist.id as string) : false;

  const visibleAnnouncements = (announcements ?? []).filter(
    (a) => !(a.members_only as boolean) || isMember
  );

  const member = await loadMemberView(supabase, userId, artist.id as string, plan);

  return {
    artistId: artist.id as string,
    artistSlug: artist.slug as string,
    artistName: artist.stage_name as string,
    plan,
    announcements: visibleAnnouncements.map((a) => ({
      id: a.id as string,
      title: a.title as string,
      body: a.body as string,
      membersOnly: Boolean(a.members_only),
      publishedAt: a.published_at as string,
    })),
    member,
    isOwner: userId ? artist.user_id === userId : false,
  };
}

export async function buildBackstageArtistHub(
  supabase: SupabaseClient,
  artistUserId: string
): Promise<BackstageArtistHub | null> {
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug")
    .eq("user_id", artistUserId)
    .maybeSingle();

  if (!artist) return null;

  const { data: planRows } = await supabase
    .from("backstage_pass_plans")
    .select("*")
    .eq("artist_id", artist.id as string)
    .order("created_at", { ascending: true });

  const { data: subs } = await supabase
    .from("backstage_subscriptions")
    .select("id, status, created_at, user_id, plan_id, backstage_pass_plans(price_cents_monthly)")
    .eq("artist_id", artist.id as string);

  const active = (subs ?? []).filter((s) => s.status === "active" || s.status === "trialing");
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let mrrCents = 0;
  for (const s of active) {
    const planRaw = s.backstage_pass_plans as { price_cents_monthly: number } | { price_cents_monthly: number }[];
    const price = Array.isArray(planRaw) ? planRaw[0]?.price_cents_monthly : planRaw?.price_cents_monthly;
    mrrCents += price ?? 0;
  }

  const newThisMonth = active.filter(
    (s) => new Date(s.created_at as string).getTime() >= monthStart.getTime()
  ).length;

  const recentIds = active.slice(0, 5).map((s) => s.user_id as string);
  const { data: profiles } = recentIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", recentIds)
    : { data: [] };

  const names = new Map((profiles ?? []).map((p) => [p.id as string, (p.display_name as string) ?? "Member"]));

  return {
    artistId: artist.id as string,
    artistSlug: artist.slug as string,
    plans: (planRows ?? []).map((r) => mapPlan(r as Record<string, unknown>)),
    analytics: {
      activeSubscribers: active.length,
      mrrCents,
      newThisMonth,
      totalAllTime: subs?.length ?? 0,
    },
    recentSubscribers: active.slice(0, 8).map((s) => ({
      displayName: names.get(s.user_id as string) ?? "Member",
      since: s.created_at as string,
    })),
  };
}

export async function upsertBackstagePlan(
  supabase: SupabaseClient,
  artistId: string,
  input: {
    name: string;
    description: string | null;
    priceCentsMonthly: number;
    perks: string[];
    discordUrl: string | null;
    earlyTicketHours: number;
  }
) {
  const { error } = await supabase.from("backstage_pass_plans").upsert(
    {
      artist_id: artistId,
      slug: "backstage",
      name: input.name,
      description: input.description,
      price_cents_monthly: input.priceCentsMonthly,
      perks: input.perks,
      discord_url: input.discordUrl,
      early_ticket_hours: input.earlyTicketHours,
      is_active: true,
    },
    { onConflict: "artist_id,slug" }
  );

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
