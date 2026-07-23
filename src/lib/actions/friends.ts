"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  createWatchPartySchema,
  followUserSchema,
  friendRequestIdSchema,
  friendUserIdSchema,
  joinWatchPartySchema,
  sendFriendMessageSchema,
  startFriendChatSchema,
  watchPartyMessageSchema,
} from "@/lib/validations/friends";
import {
  ensureFriendConversation,
  randomInviteCode,
  recordFriendActivity,
} from "@/lib/services/friends.service";

export type FriendActionResult = { ok: true } | { ok: false; error: string };
export type FriendActionWithId = { ok: true; id?: string; inviteCode?: string } | { ok: false; error: string };

const respondSchema = friendRequestIdSchema.extend({ accept: z.boolean() });

export async function sendFriendRequestAction(input: unknown): Promise<FriendActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Friends requires Supabase" };

  const parsed = friendUserIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid user" };
  if (parsed.data.userId === user.id) return { ok: false, error: "Cannot friend yourself" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${parsed.data.userId}),and(requester_id.eq.${parsed.data.userId},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existing?.status === "accepted") return { ok: false, error: "Already friends" };
  if (existing?.status === "pending") return { ok: false, error: "Request already pending" };

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: parsed.data.userId,
    status: "pending",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/friends");
  return { ok: true };
}

export async function respondFriendRequestAction(input: unknown): Promise<FriendActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("friendships")
    .select("id, addressee_id, status")
    .eq("id", parsed.data.requestId)
    .maybeSingle();

  if (!row || row.status !== "pending") return { ok: false, error: "Request not found" };
  if (row.addressee_id !== user.id) return { ok: false, error: "Not allowed" };

  const status = parsed.data.accept ? "accepted" : "declined";
  const { error } = await supabase
    .from("friendships")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", parsed.data.requestId);

  if (error) return { ok: false, error: error.message };

  if (status === "accepted") {
    await recordFriendActivity(
      supabase,
      user.id,
      "friend_accepted",
      "Connected with a new friend on LiveCircuit"
    );
  }

  revalidatePath("/friends");
  return { ok: true };
}

export async function followUserAction(input: unknown): Promise<FriendActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = followUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid user" };
  if (parsed.data.userId === user.id) return { ok: false, error: "Cannot follow yourself" };

  const supabase = await createClient();
  const { error } = await supabase.from("user_follows").insert({
    follower_id: user.id,
    following_id: parsed.data.userId,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/friends");
  return { ok: true };
}

export async function startFriendChatAction(input: unknown): Promise<FriendActionWithId> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = startFriendChatSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid peer" };

  const supabase = await createClient();
  const { data: friendship } = await supabase
    .from("friendships")
    .select("status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${parsed.data.peerId}),and(requester_id.eq.${parsed.data.peerId},addressee_id.eq.${user.id})`
    )
    .eq("status", "accepted")
    .maybeSingle();

  if (!friendship) return { ok: false, error: "Friends only — accept a request first" };

  const convId = await ensureFriendConversation(supabase, user.id, parsed.data.peerId);
  if (!convId) return { ok: false, error: "Could not open chat" };
  return { ok: true, id: convId };
}

export async function startFriendChatAndRedirectAction(peerId: string): Promise<FriendActionWithId | void> {
  const result = await startFriendChatAction({ peerId });
  if (!result.ok) return result;
  redirect(`/friends/messages/${result.id}`);
}

export async function sendFriendMessageAction(input: unknown): Promise<FriendActionWithId> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = sendFriendMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid message" };

  const supabase = await createClient();
  const { error } = await supabase.from("friend_messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: user.id,
    body: parsed.data.body,
  });

  if (error) return { ok: false, error: error.message };

  await supabase
    .from("friend_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", parsed.data.conversationId);

  revalidatePath("/friends");
  revalidatePath(`/friends/messages/${parsed.data.conversationId}`);
  return { ok: true, id: parsed.data.conversationId };
}

export async function markFriendConversationReadAction(conversationId: string) {
  const user = await getSessionUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("friend_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .is("read_at", null);
}

export async function createWatchPartyAction(input: unknown): Promise<FriendActionWithId> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = createWatchPartySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid party details" };

  const supabase = await createClient();
  let inviteCode = randomInviteCode();
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await supabase
      .from("watch_parties")
      .select("id")
      .eq("invite_code", inviteCode)
      .maybeSingle();
    if (!clash) break;
    inviteCode = randomInviteCode();
  }

  const { data: party, error } = await supabase
    .from("watch_parties")
    .insert({
      host_id: user.id,
      event_id: parsed.data.eventId ?? null,
      invite_code: inviteCode,
      title: parsed.data.title,
      status: "open",
    })
    .select("id, invite_code")
    .single();

  if (error || !party) return { ok: false, error: error?.message ?? "Could not create party" };

  await supabase.from("watch_party_members").insert({
    party_id: party.id,
    user_id: user.id,
  });

  await recordFriendActivity(
    supabase,
    user.id,
    "watch_party",
    `Started watch party: ${parsed.data.title}`
  );

  revalidatePath("/friends");
  return { ok: true, id: party.id as string, inviteCode: party.invite_code as string };
}

export async function joinWatchPartyAction(input: unknown): Promise<FriendActionWithId> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = joinWatchPartySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid invite code" };

  const supabase = await createClient();
  const code = parsed.data.inviteCode.toUpperCase();
  const { data: party } = await supabase
    .from("watch_parties")
    .select("id, status")
    .eq("invite_code", code)
    .maybeSingle();

  if (!party || party.status === "ended") return { ok: false, error: "Party not found" };

  const { error } = await supabase.from("watch_party_members").upsert(
    { party_id: party.id, user_id: user.id },
    { onConflict: "party_id,user_id" }
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/friends");
  revalidatePath(`/friends/party/${code}`);
  return { ok: true, id: party.id as string, inviteCode: code };
}

export async function sendWatchPartyMessageAction(input: unknown): Promise<FriendActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = watchPartyMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid message" };

  const supabase = await createClient();
  const { error } = await supabase.from("watch_party_messages").insert({
    party_id: parsed.data.partyId,
    sender_id: user.id,
    body: parsed.data.body,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/friends/party/${parsed.data.partyId}`);
  return { ok: true };
}
