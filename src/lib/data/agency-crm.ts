import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CRM_MARKETING_CHECKLIST,
  CRM_PERFORMANCE_CHECKLIST,
  CRM_PIPELINE_STAGES,
  type CrmPipelineStageId,
} from "@/lib/agency/crm-constants";
import type {
  CrmActivity,
  CrmAnalyticsPayload,
  CrmBooking,
  CrmContact,
  CrmContract,
  CrmDashboardPayload,
  CrmFile,
  CrmPayment,
  CrmSearchResult,
  CrmTask,
  CrmChecklistItem,
} from "@/lib/agency/crm-types";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

export async function listCrmBookings(
  supabase: SupabaseClient,
  orgId: string,
  filters?: {
    stage?: CrmPipelineStageId;
    artistId?: string;
    assignedTo?: string;
    search?: string;
  }
): Promise<CrmBooking[]> {
  let query = supabase
    .from("agency_crm_bookings")
    .select(
      "*, artists(id, slug, stage_name, banner_url), venues(id, slug, name)"
    )
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });

  if (filters?.stage) query = query.eq("stage", filters.stage);
  if (filters?.artistId) query = query.eq("artist_id", filters.artistId);
  if (filters?.assignedTo) query = query.eq("assigned_to", filters.assignedTo);
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[CRM] listCrmBookings", error.message);
    return [];
  }
  return (data ?? []) as CrmBooking[];
}

export async function getCrmBooking(
  supabase: SupabaseClient,
  orgId: string,
  bookingId: string
): Promise<CrmBooking | null> {
  const { data, error } = await supabase
    .from("agency_crm_bookings")
    .select(
      "*, artists(id, slug, stage_name, banner_url), venues(id, slug, name)"
    )
    .eq("organization_id", orgId)
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) return null;
  return data as CrmBooking;
}

export async function listCrmContacts(
  supabase: SupabaseClient,
  orgId: string,
  filters?: { contactType?: string; search?: string }
): Promise<CrmContact[]> {
  let query = supabase
    .from("agency_crm_contacts")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");

  if (filters?.contactType) query = query.eq("contact_type", filters.contactType);
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,company.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  const { data } = await query;
  return (data ?? []) as CrmContact[];
}

export async function getCrmContact(
  supabase: SupabaseClient,
  orgId: string,
  contactId: string
): Promise<CrmContact | null> {
  const { data } = await supabase
    .from("agency_crm_contacts")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", contactId)
    .maybeSingle();
  return (data as CrmContact) ?? null;
}

export async function listCrmTasksForBooking(
  supabase: SupabaseClient,
  bookingId: string
): Promise<CrmTask[]> {
  const { data } = await supabase
    .from("agency_crm_tasks")
    .select("*")
    .eq("booking_id", bookingId)
    .order("due_at", { ascending: true, nullsFirst: false });
  return (data ?? []) as CrmTask[];
}

export async function listCrmActivities(
  supabase: SupabaseClient,
  orgId: string,
  bookingId?: string,
  limit = 50
): Promise<CrmActivity[]> {
  let query = supabase
    .from("agency_crm_activities")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (bookingId) query = query.eq("booking_id", bookingId);

  const { data } = await query;
  return (data ?? []) as CrmActivity[];
}

export async function listCrmPayments(
  supabase: SupabaseClient,
  bookingId: string
): Promise<CrmPayment[]> {
  const { data } = await supabase
    .from("agency_crm_payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CrmPayment[];
}

export async function listCrmContracts(
  supabase: SupabaseClient,
  bookingId: string
): Promise<CrmContract[]> {
  const { data } = await supabase
    .from("agency_crm_contracts")
    .select("*")
    .eq("booking_id", bookingId)
    .order("version", { ascending: false });
  return (data ?? []) as CrmContract[];
}

export async function listCrmFiles(
  supabase: SupabaseClient,
  bookingId: string
): Promise<CrmFile[]> {
  const { data } = await supabase
    .from("agency_crm_files")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CrmFile[];
}

export async function listCrmChecklist(
  supabase: SupabaseClient,
  bookingId: string
): Promise<CrmChecklistItem[]> {
  const { data } = await supabase
    .from("agency_crm_checklist_items")
    .select("*")
    .eq("booking_id", bookingId)
    .order("sort_order");
  return (data ?? []) as CrmChecklistItem[];
}

export async function seedCrmChecklistForBooking(
  supabase: SupabaseClient,
  bookingId: string
): Promise<void> {
  const existing = await listCrmChecklist(supabase, bookingId);
  if (existing.length > 0) return;

  const items = [
    ...CRM_MARKETING_CHECKLIST.map((item, i) => ({
      booking_id: bookingId,
      checklist_type: "marketing" as const,
      item_key: item.key,
      label: item.label,
      sort_order: i,
    })),
    ...CRM_PERFORMANCE_CHECKLIST.map((item, i) => ({
      booking_id: bookingId,
      checklist_type: "performance" as const,
      item_key: item.key,
      label: item.label,
      sort_order: i,
    })),
  ];

  await supabase.from("agency_crm_checklist_items").insert(items);
}

export async function logCrmActivity(
  supabase: SupabaseClient,
  input: {
    orgId: string;
    bookingId?: string;
    actorUserId?: string;
    activityType: string;
    title: string;
    body?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await supabase.from("agency_crm_activities").insert({
    organization_id: input.orgId,
    booking_id: input.bookingId ?? null,
    actor_user_id: input.actorUserId ?? null,
    activity_type: input.activityType,
    title: input.title,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function getCrmDashboardPayload(
  supabase: SupabaseClient,
  orgId: string
): Promise<CrmDashboardPayload> {
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  const [
    bookingsRes,
    tasksRes,
    contractsRes,
    paymentsRes,
    activityRes,
    messagesRes,
    sponsorshipsRes,
    calendarRes,
  ] = await Promise.all([
    supabase
      .from("agency_crm_bookings")
      .select("*, artists(stage_name)")
      .eq("organization_id", orgId)
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(100),
    supabase
      .from("agency_crm_tasks")
      .select("*")
      .eq("organization_id", orgId)
      .neq("status", "done")
      .order("due_at", { ascending: true })
      .limit(100),
    supabase
      .from("agency_crm_contracts")
      .select("*, agency_crm_bookings!inner(organization_id, title)")
      .eq("agency_crm_bookings.organization_id", orgId)
      .in("status", ["draft", "pending_approval", "sent"])
      .limit(20),
    supabase
      .from("agency_crm_payments")
      .select("*")
      .eq("organization_id", orgId)
      .in("status", ["pending", "overdue"])
      .limit(20),
    supabase
      .from("agency_crm_activities")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("agency_conversations")
      .select("id, subject, updated_at")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("agency_sponsorship_proposals")
      .select("id, title, status")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("agency_calendar_events")
      .select("id, title, starts_at")
      .eq("organization_id", orgId)
      .gte("starts_at", now.toISOString())
      .order("starts_at")
      .limit(8),
  ]);

  const bookings = (bookingsRes.data ?? []) as CrmBooking[];
  const tasks = (tasksRes.data ?? []) as CrmTask[];

  const upcomingEvents = bookings.filter(
    (b) => b.starts_at && b.starts_at >= now.toISOString() && b.stage !== "cancelled"
  ).slice(0, 8);

  const todaysTasks = tasks.filter(
    (t) => t.due_at && t.due_at >= todayStart && t.due_at <= todayEnd
  );

  const upcomingDeadlines = tasks
    .filter((t) => t.due_at && t.due_at > todayEnd)
    .slice(0, 10);

  const stageCounts = CRM_PIPELINE_STAGES.map((stage) => ({
    stage: stage.id,
    count: bookings.filter((b) => b.stage === stage.id).length,
  }));

  const activeBookings = bookings.filter(
    (b) => !["completed", "cancelled"].includes(b.stage)
  );

  const completedBookings = bookings.filter((b) => b.stage === "completed");

  const monthlyRevenueCents = bookings
    .filter((b) => b.updated_at >= monthStart && b.updated_at <= monthEnd)
    .reduce((sum, b) => sum + (b.actual_revenue_cents || 0), 0);

  const expectedRevenueCents = activeBookings.reduce(
    (sum, b) => sum + (b.projected_revenue_cents || 0),
    0
  );

  const artistMap = new Map<string, { name: string; revenueCents: number; bookings: number }>();
  for (const b of bookings) {
    const name = (b.artists as { stage_name?: string } | null)?.stage_name ?? "Unknown";
    const existing = artistMap.get(name) ?? { name, revenueCents: 0, bookings: 0 };
    existing.revenueCents += b.actual_revenue_cents || 0;
    existing.bookings += 1;
    artistMap.set(name, existing);
  }
  const topArtists = [...artistMap.values()]
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);

  const ticketPrices = bookings
    .filter((b) => b.ticket_price_cents)
    .map((b) => b.ticket_price_cents!);
  const avgTicketPriceCents =
    ticketPrices.length > 0
      ? Math.round(ticketPrices.reduce((a, b) => a + b, 0) / ticketPrices.length)
      : 0;

  const wonBookings = bookings.filter((b) =>
    ["contract_signed", "event_scheduled", "marketing", "tickets_on_sale", "live_event", "completed"].includes(b.stage)
  );
  const conversionRate =
    bookings.length > 0 ? Math.round((wonBookings.length / bookings.length) * 100) : 0;

  return {
    upcomingEvents,
    todaysTasks,
    pendingContracts: (contractsRes.data ?? []) as CrmContract[],
    pendingPayments: (paymentsRes.data ?? []) as CrmPayment[],
    recentActivity: (activityRes.data ?? []) as CrmActivity[],
    recentMessages: (messagesRes.data ?? []) as { id: string; subject: string | null; updated_at: string }[],
    upcomingDeadlines,
    bookingsByStage: stageCounts,
    monthlyRevenueCents,
    expectedRevenueCents,
    ticketSalesCount: 0,
    topArtists,
    recentSponsorships: (sponsorshipsRes.data ?? []) as { id: string; title: string; status: string }[],
    calendarPreview: (calendarRes.data ?? []) as { id: string; title: string; starts_at: string }[],
    performanceMetrics: {
      conversionRate,
      avgTicketPriceCents,
      repeatCustomers: 0,
      activeBookings: activeBookings.length,
      completedBookings: completedBookings.length,
    },
  };
}

export async function getCrmAnalyticsPayload(
  supabase: SupabaseClient,
  orgId: string
): Promise<CrmAnalyticsPayload> {
  const { data: bookings } = await supabase
    .from("agency_crm_bookings")
    .select("*, artists(stage_name)")
    .eq("organization_id", orgId);

  const all = (bookings ?? []) as CrmBooking[];

  const agencyRevenueCents = all.reduce((s, b) => s + (b.actual_revenue_cents || 0), 0);

  const artistRevenue = new Map<string, number>();
  for (const b of all) {
    const name = (b.artists as { stage_name?: string } | null)?.stage_name ?? "Unknown";
    artistRevenue.set(name, (artistRevenue.get(name) ?? 0) + (b.actual_revenue_cents || 0));
  }

  const revenueByArtist = [...artistRevenue.entries()]
    .map(([name, cents]) => ({ name, cents }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 10);

  const revenueByEvent = all
    .filter((b) => b.actual_revenue_cents > 0)
    .map((b) => ({ title: b.title, cents: b.actual_revenue_cents }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 10);

  const monthMap = new Map<string, { revenueCents: number; bookings: number }>();
  for (const b of all) {
    const month = format(new Date(b.created_at), "MMM yyyy");
    const entry = monthMap.get(month) ?? { revenueCents: 0, bookings: 0 };
    entry.revenueCents += b.actual_revenue_cents || 0;
    entry.bookings += 1;
    monthMap.set(month, entry);
  }

  const ticketPrices = all.filter((b) => b.ticket_price_cents).map((b) => b.ticket_price_cents!);
  const avgTicketPriceCents =
    ticketPrices.length > 0
      ? Math.round(ticketPrices.reduce((a, b) => a + b, 0) / ticketPrices.length)
      : 0;

  const won = all.filter((b) =>
    ["contract_signed", "event_scheduled", "marketing", "tickets_on_sale", "live_event", "completed"].includes(b.stage)
  );

  return {
    agencyRevenueCents,
    revenueByArtist,
    revenueByEvent,
    ticketSales: [],
    attendance: [],
    conversionRate: all.length > 0 ? Math.round((won.length / all.length) * 100) : 0,
    avgTicketPriceCents,
    repeatCustomers: 0,
    sponsorRevenueCents: 0,
    growthTrend: [...monthMap.entries()].map(([month, v]) => ({
      month,
      revenueCents: v.revenueCents,
      bookings: v.bookings,
    })),
  };
}

export async function searchCrm(
  supabase: SupabaseClient,
  orgId: string,
  query: string
): Promise<CrmSearchResult[]> {
  if (!query.trim()) return [];
  const q = query.trim();
  const results: CrmSearchResult[] = [];

  const [bookings, contacts, tasks] = await Promise.all([
    supabase
      .from("agency_crm_bookings")
      .select("id, title, stage")
      .eq("organization_id", orgId)
      .or(`title.ilike.%${q}%,contact_name.ilike.%${q}%,notes.ilike.%${q}%`)
      .limit(10),
    supabase
      .from("agency_crm_contacts")
      .select("id, name, company, contact_type")
      .eq("organization_id", orgId)
      .or(`name.ilike.%${q}%,company.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10),
    supabase
      .from("agency_crm_tasks")
      .select("id, title, booking_id")
      .eq("organization_id", orgId)
      .ilike("title", `%${q}%`)
      .limit(10),
  ]);

  for (const b of bookings.data ?? []) {
    results.push({
      type: "booking",
      id: b.id as string,
      title: b.title as string,
      subtitle: b.stage as string,
      href: `/agency/crm/bookings/${b.id}`,
    });
  }
  for (const c of contacts.data ?? []) {
    results.push({
      type: "contact",
      id: c.id as string,
      title: c.name as string,
      subtitle: (c.company as string) ?? (c.contact_type as string),
      href: `/agency/crm/contacts?q=${c.id}`,
    });
  }
  for (const t of tasks.data ?? []) {
    results.push({
      type: "task",
      id: t.id as string,
      title: t.title as string,
      href: `/agency/crm/bookings/${t.booking_id}`,
    });
  }

  return results;
}

export async function listOrgMembersForCrm(
  supabase: SupabaseClient,
  orgId: string
): Promise<{ user_id: string; display_name: string | null; role: string }[]> {
  const { data } = await supabase
    .from("agency_organization_members")
    .select("user_id, role, profiles(display_name)")
    .eq("organization_id", orgId);

  return (data ?? []).map((m) => {
    const profile = m.profiles as { display_name: string | null } | { display_name: string | null }[] | null;
    const resolved = Array.isArray(profile) ? profile[0] : profile;
    return {
      user_id: m.user_id as string,
      role: m.role as string,
      display_name: resolved?.display_name ?? null,
    };
  });
}

export async function listOrgArtistsForCrm(
  supabase: SupabaseClient,
  orgId: string
): Promise<{ artist_id: string; stage_name: string; slug: string }[]> {
  const { data } = await supabase
    .from("agency_managed_artists")
    .select("artist_id, artists(slug, stage_name)")
    .eq("organization_id", orgId)
    .eq("status", "active");

  return (data ?? []).map((row) => {
    const artist = row.artists as { slug: string; stage_name: string } | { slug: string; stage_name: string }[] | null;
    const resolved = Array.isArray(artist) ? artist[0] : artist;
    return {
      artist_id: row.artist_id as string,
      slug: resolved?.slug ?? "",
      stage_name: resolved?.stage_name ?? "Unknown",
    };
  });
}

export async function listOrgVenuesForCrm(
  supabase: SupabaseClient
): Promise<{ id: string; name: string; slug: string }[]> {
  const { data } = await supabase
    .from("venues")
    .select("id, name, slug")
    .order("name")
    .limit(200);
  return (data ?? []) as { id: string; name: string; slug: string }[];
}
