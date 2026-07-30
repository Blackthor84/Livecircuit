import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveProducerPermissions,
} from "@/lib/production/permissions";
import type {
  ProducerChecklist,
  ProducerLabel,
  ProducerPermissions,
  ProducerStaffRole,
} from "@/lib/production/types";

export type EventProducerRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string | null;
  invite_token: string | null;
  status: "pending" | "accepted" | "declined" | "expired";
  staff_role: ProducerStaffRole;
  producer_label: ProducerLabel;
  custom_label: string | null;
  permissions: ProducerPermissions;
  expires_at: string | null;
  permanent: boolean;
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function listEventProducers(supabase: SupabaseClient, eventId: string) {
  const { data } = await supabase
    .from("event_producers")
    .select(
      "id, event_id, user_id, email, invite_token, status, staff_role, producer_label, custom_label, permissions, expires_at, permanent, invited_by, accepted_at, created_at, profiles(display_name, username, avatar_url)"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => {
    const profiles = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { ...row, profiles: profiles ?? null } as EventProducerRow;
  });
}

export async function getEventProducerForUser(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<EventProducerRow | null> {
  const { data } = await supabase
    .from("event_producers")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .maybeSingle();

  if (!data) return null;

  const expiresAt = data.expires_at as string | null;
  if (expiresAt && !data.permanent && new Date(expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return data as EventProducerRow;
}

export async function getProducerByInviteToken(supabase: SupabaseClient, token: string) {
  const { data } = await supabase
    .from("event_producers")
    .select("*")
    .eq("invite_token", token)
    .in("status", ["pending", "accepted"])
    .maybeSingle();
  return (data as EventProducerRow | null) ?? null;
}

export async function inviteProducerByUserId(
  supabase: SupabaseClient,
  input: {
    eventId: string;
    userId: string;
    invitedBy: string;
    staffRole: ProducerStaffRole;
    producerLabel: ProducerLabel;
    customLabel?: string;
    permissions?: ProducerPermissions;
    permanent?: boolean;
    eventEndsAt?: string | null;
  }
) {
  const permissions = resolveProducerPermissions(input.staffRole, input.permissions);
  const expiresAt =
    input.permanent || !input.eventEndsAt
      ? null
      : new Date(new Date(input.eventEndsAt).getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("event_producers")
    .insert({
      event_id: input.eventId,
      user_id: input.userId,
      status: "accepted",
      staff_role: input.staffRole,
      producer_label: input.producerLabel,
      custom_label: input.customLabel ?? null,
      permissions,
      permanent: input.permanent ?? false,
      expires_at: expiresAt,
      invited_by: input.invitedBy,
      accepted_at: new Date().toISOString(),
      invite_token: generateToken(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as EventProducerRow;
}

export async function inviteProducerByEmail(
  supabase: SupabaseClient,
  input: {
    eventId: string;
    email: string;
    invitedBy: string;
    staffRole: ProducerStaffRole;
    producerLabel: ProducerLabel;
    customLabel?: string;
    permissions?: ProducerPermissions;
    permanent?: boolean;
    eventEndsAt?: string | null;
  }
) {
  const permissions = resolveProducerPermissions(input.staffRole, input.permissions);
  const token = generateToken();
  const expiresAt =
    input.permanent || !input.eventEndsAt
      ? null
      : new Date(new Date(input.eventEndsAt).getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("event_producers")
    .insert({
      event_id: input.eventId,
      email: input.email.toLowerCase().trim(),
      invite_token: token,
      status: "pending",
      staff_role: input.staffRole,
      producer_label: input.producerLabel,
      custom_label: input.customLabel ?? null,
      permissions,
      permanent: input.permanent ?? false,
      expires_at: expiresAt,
      invited_by: input.invitedBy,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as EventProducerRow;
}

export async function generateProducerLinkInvite(
  supabase: SupabaseClient,
  input: {
    eventId: string;
    invitedBy: string;
    staffRole: ProducerStaffRole;
    producerLabel: ProducerLabel;
    customLabel?: string;
    permissions?: ProducerPermissions;
    permanent?: boolean;
    eventEndsAt?: string | null;
  }
) {
  return inviteProducerByEmail(supabase, {
    ...input,
    email: `link+${generateToken().slice(0, 8)}@producers.livecircuit.local`,
  });
}

export async function acceptProducerInvite(
  supabase: SupabaseClient,
  token: string,
  userId: string
) {
  const row = await getProducerByInviteToken(supabase, token);
  if (!row) throw new Error("Invite not found or expired");

  const { data, error } = await supabase
    .from("event_producers")
    .update({
      user_id: userId,
      status: "accepted",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as EventProducerRow;
}

export async function updateProducerPermissions(
  supabase: SupabaseClient,
  producerId: string,
  permissions: ProducerPermissions
) {
  const { error } = await supabase
    .from("event_producers")
    .update({ permissions, updated_at: new Date().toISOString() })
    .eq("id", producerId);
  if (error) throw new Error(error.message);
}

export async function removeEventProducer(supabase: SupabaseClient, producerId: string) {
  const { error } = await supabase.from("event_producers").delete().eq("id", producerId);
  if (error) throw new Error(error.message);
}

export async function updateProducerChecklist(
  supabase: SupabaseClient,
  eventId: string,
  checklist: ProducerChecklist
) {
  const { error } = await supabase
    .from("stream_rehearsals")
    .update({ producer_checklist: checklist, updated_at: new Date().toISOString() })
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);
}

export async function getProducerChecklist(supabase: SupabaseClient, eventId: string) {
  const { data } = await supabase
    .from("stream_rehearsals")
    .select("producer_checklist")
    .eq("event_id", eventId)
    .maybeSingle();
  return (data?.producer_checklist ?? {}) as ProducerChecklist;
}

export async function listProducerNotes(supabase: SupabaseClient, eventId: string) {
  const { data } = await supabase
    .from("producer_notes")
    .select("id, event_id, producer_id, body, timestamp_ms, created_at, profiles(display_name, username)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function addProducerNote(
  supabase: SupabaseClient,
  input: { eventId: string; producerId: string; body: string; timestampMs?: number }
) {
  const { error } = await supabase.from("producer_notes").insert({
    event_id: input.eventId,
    producer_id: input.producerId,
    body: input.body.trim(),
    timestamp_ms: input.timestampMs ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function isUserBannedFromEvent(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
) {
  const { data } = await supabase
    .from("event_chat_bans")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}
