import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export type ConversationListItem = {
  id: string;
  last_message_at: string;
  artist: { id: string; slug: string; stage_name: string; banner_url: string | null };
  fan: { id: string; display_name: string | null; avatar_url: string | null };
  lastPreview: string | null;
};

export type DirectMessageRow = {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export async function listConversationsForUser(userId: string): Promise<ConversationListItem[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  let convQuery = supabase
    .from("conversations")
    .select("id, last_message_at, artist_id, fan_id, artists(id, slug, stage_name, banner_url)")
    .order("last_message_at", { ascending: false })
    .limit(30);

  convQuery = artist ? convQuery.eq("artist_id", artist.id) : convQuery.eq("fan_id", userId);

  const { data: rows } = await convQuery;
  if (!rows?.length) return [];

  const fanIds = [...new Set(rows.map((r) => r.fan_id as string))];
  const { data: fanProfiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", fanIds);

  const fanMap = new Map((fanProfiles ?? []).map((p) => [p.id as string, p]));

  const items: ConversationListItem[] = [];
  for (const row of rows) {
    const artists = row.artists as ConversationListItem["artist"] | ConversationListItem["artist"][];
    const artistMeta = Array.isArray(artists) ? artists[0] : artists;
    const fanMeta = fanMap.get(row.fan_id as string);
    if (!artistMeta || !fanMeta) continue;

    const { data: lastMsg } = await supabase
      .from("direct_messages")
      .select("body")
      .eq("conversation_id", row.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    items.push({
      id: row.id as string,
      last_message_at: row.last_message_at as string,
      artist: artistMeta,
      fan: {
        id: fanMeta.id as string,
        display_name: fanMeta.display_name as string | null,
        avatar_url: fanMeta.avatar_url as string | null,
      },
      lastPreview: (lastMsg?.body as string) ?? null,
    });
  }

  return items;
}

export async function getConversationMessages(
  conversationId: string,
  userId: string,
  limit = 80
): Promise<{ messages: DirectMessageRow[]; conversation: ConversationListItem | null }> {
  if (!isSupabaseConfigured()) return { messages: [], conversation: null };

  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, last_message_at, artist_id, fan_id, artists(id, slug, stage_name, banner_url)")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) return { messages: [], conversation: null };

  const { data: artistRow } = await supabase
    .from("artists")
    .select("user_id")
    .eq("id", conv.artist_id)
    .maybeSingle();

  const isFan = conv.fan_id === userId;
  const isArtist = artistRow?.user_id === userId;
  if (!isFan && !isArtist) return { messages: [], conversation: null };

  const { data: fanProfile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", conv.fan_id)
    .maybeSingle();

  const { data: messages } = await supabase
    .from("direct_messages")
    .select("id, sender_id, body, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  const artists = conv.artists as ConversationListItem["artist"] | ConversationListItem["artist"][];

  return {
    messages: (messages ?? []) as DirectMessageRow[],
    conversation: {
      id: conv.id as string,
      last_message_at: conv.last_message_at as string,
      artist: (Array.isArray(artists) ? artists[0] : artists)!,
      fan: {
        id: fanProfile?.id as string,
        display_name: fanProfile?.display_name as string | null,
        avatar_url: fanProfile?.avatar_url as string | null,
      },
      lastPreview: null,
    },
  };
}

export async function getArtistProductsForManage(artistId: string) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false });

  return data ?? [];
}
