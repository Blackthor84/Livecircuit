import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";

export type WaitingListEntry = {
  id: string;
  slotTypeSlug: string;
  slotName: string;
  venueId: string | null;
  venueName: string | null;
  organizationId: string;
  organizationName: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  notes: string | null;
  queuePosition: number;
  status: string;
  createdAt: string;
};

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapWaitingList(row: Record<string, unknown>): WaitingListEntry {
  const org = unwrapJoin(row.sponsor_organizations as { name: string } | { name: string }[] | null);
  const slot = unwrapJoin(row.sponsorship_slot_types as { name: string } | { name: string }[] | null);
  const venue = unwrapJoin(row.venues as { default_name: string } | { default_name: string }[] | null);

  return {
    id: row.id as string,
    slotTypeSlug: row.slot_type_slug as string,
    slotName: slot?.name ?? "",
    venueId: (row.venue_id as string) ?? null,
    venueName: venue?.default_name ?? null,
    organizationId: row.organization_id as string,
    organizationName: org?.name ?? "",
    contactName: (row.contact_name as string) ?? null,
    contactEmail: row.contact_email as string,
    contactPhone: (row.contact_phone as string) ?? null,
    notes: (row.notes as string) ?? null,
    queuePosition: row.queue_position as number,
    status: row.status as string,
    createdAt: row.created_at as string,
  };
}

export async function listWaitingListForSlot(slotTypeSlug: string, venueId?: string | null) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  let q = admin
    .from("sponsorship_waiting_list")
    .select("*, sponsor_organizations(name), sponsorship_slot_types(name), venues(default_name)")
    .eq("slot_type_slug", slotTypeSlug)
    .eq("status", "active")
    .order("queue_position", { ascending: true });

  if (venueId) q = q.eq("venue_id", venueId);
  else q = q.is("venue_id", null);

  const { data } = await q;
  return (data ?? []).map((r) => mapWaitingList(r as Record<string, unknown>));
}

export async function countWaitingListForSlot(slotTypeSlug: string, venueId?: string | null) {
  const entries = await listWaitingListForSlot(slotTypeSlug, venueId);
  return entries.length;
}

export async function listAllWaitingList(limit = 100) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsorship_waiting_list")
    .select("*, sponsor_organizations(name), sponsorship_slot_types(name), venues(default_name)")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []).map((r) => mapWaitingList(r as Record<string, unknown>));
}

export async function listOrgWaitingList(organizationId: string) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsorship_waiting_list")
    .select("*, sponsor_organizations(name), sponsorship_slot_types(name), venues(default_name)")
    .eq("organization_id", organizationId)
    .in("status", ["active", "notified"])
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => mapWaitingList(r as Record<string, unknown>));
}

export async function getNextQueuePosition(slotTypeSlug: string, venueId?: string | null) {
  const entries = await listWaitingListForSlot(slotTypeSlug, venueId);
  return entries.length + 1;
}
