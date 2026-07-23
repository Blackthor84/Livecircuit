"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  sendDirectMessageSchema,
  startConversationSchema,
} from "@/lib/validations/messaging-merch";

export type MessageActionResult =
  | { ok: true; conversationId?: string }
  | { ok: false; error: string };

export async function startConversationAction(input: unknown): Promise<MessageActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Messaging requires Supabase" };

  const parsed = startConversationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid artist" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("artist_id", parsed.data.artistId)
    .eq("fan_id", user.id)
    .maybeSingle();

  if (existing) return { ok: true, conversationId: existing.id };

  const { data, error } = await supabase
    .from("conversations")
    .insert({ artist_id: parsed.data.artistId, fan_id: user.id })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not start chat" };
  return { ok: true, conversationId: data.id as string };
}

export async function startConversationAndRedirectAction(artistId: string) {
  const result = await startConversationAction({ artistId });
  if (!result.ok) return result;
  redirect(`/messages/${result.conversationId}`);
}

export async function sendDirectMessageAction(input: unknown): Promise<MessageActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = sendDirectMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message" };
  }

  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, fan_id, artist_id")
    .eq("id", parsed.data.conversationId)
    .maybeSingle();

  if (!conv) return { ok: false, error: "Conversation not found" };

  const { data: artistRow } = await supabase
    .from("artists")
    .select("user_id")
    .eq("id", conv.artist_id)
    .maybeSingle();

  const allowed = conv.fan_id === user.id || artistRow?.user_id === user.id;
  if (!allowed) return { ok: false, error: "Not allowed" };

  const { error } = await supabase.from("direct_messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: user.id,
    body: parsed.data.body.trim(),
  });

  if (error) return { ok: false, error: error.message };

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", parsed.data.conversationId);

  revalidatePath("/messages");
  revalidatePath(`/messages/${parsed.data.conversationId}`);
  return { ok: true, conversationId: parsed.data.conversationId };
}

export async function markConversationReadAction(conversationId: string) {
  const user = await getSessionUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .is("read_at", null);
}
