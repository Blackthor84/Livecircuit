import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { buildFriendsHubReport } from "@/lib/services/friends.service";
import type { FriendsHubReport } from "@/lib/types/friends";

function demoReport(_userId: string): FriendsHubReport {
  const friend: FriendsHubReport["friends"][0] = {
    userId: "demo-friend-1",
    displayName: "Alex Rivera",
    avatarUrl: null,
    presence: "online",
    lastSeenAt: new Date().toISOString(),
    mutualFriends: 2,
  };
  return {
    friends: [friend],
    incoming: [
      {
        id: "req-1",
        direction: "incoming",
        createdAt: new Date().toISOString(),
        from: {
          userId: "demo-friend-2",
          displayName: "Jordan Lee",
          avatarUrl: null,
          presence: "away",
          lastSeenAt: new Date().toISOString(),
          mutualFriends: 1,
        },
      },
    ],
    outgoing: [],
    followingCount: 12,
    followersCount: 8,
    activity: [
      {
        id: "act-1",
        actorName: "Alex Rivera",
        verb: "ticket_purchased",
        summary: "Grabbed a ticket for Neon Nights Tour",
        createdAt: new Date().toISOString(),
      },
    ],
    sharedEvents: [
      {
        eventId: "ev-1",
        eventTitle: "Neon Nights — Live",
        eventSlug: "neon-nights-live",
        artistSlug: "demo-artist",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        friendName: "Alex Rivera",
      },
    ],
    recommendations: [
      {
        userId: "demo-rec-1",
        displayName: "Sam Park",
        avatarUrl: null,
        presence: "offline",
        lastSeenAt: null,
        mutualFriends: 3,
        reason: "Mutual friends on LiveCircuit",
      },
    ],
    watchParties: [
      {
        id: "party-1",
        inviteCode: "WATCH42",
        title: "Watch together: Neon Nights",
        hostName: "You",
        memberCount: 2,
        eventId: "ev-1",
      },
    ],
    computedAt: new Date().toISOString(),
  };
}

export async function getFriendsHubReport(userId: string): Promise<FriendsHubReport> {
  if (!isSupabaseConfigured()) return demoReport(userId);
  const supabase = await createClient();
  return buildFriendsHubReport(supabase, userId);
}

export type FriendMessageRow = {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type FriendConversationMeta = {
  id: string;
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
  last_message_at: string;
};

export async function listFriendConversations(userId: string): Promise<FriendConversationMeta[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("friend_conversations")
    .select("id, user_low, user_high, last_message_at")
    .or(`user_low.eq.${userId},user_high.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  if (!rows?.length) return [];

  const peerIds = rows.map((r) =>
    r.user_low === userId ? (r.user_high as string) : (r.user_low as string)
  );
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", peerIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  return rows.map((r) => {
    const peerId = r.user_low === userId ? (r.user_high as string) : (r.user_low as string);
    const prof = profileMap.get(peerId);
    return {
      id: r.id as string,
      peerId,
      peerName: prof?.display_name?.trim() || "Friend",
      peerAvatar: (prof?.avatar_url as string | null) ?? null,
      last_message_at: r.last_message_at as string,
    };
  });
}

export async function getFriendConversationMessages(
  conversationId: string,
  userId: string,
  limit = 80
): Promise<{ messages: FriendMessageRow[]; meta: FriendConversationMeta | null }> {
  if (!isSupabaseConfigured()) return { messages: [], meta: null };

  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("friend_conversations")
    .select("id, user_low, user_high, last_message_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) return { messages: [], meta: null };
  const allowed = conv.user_low === userId || conv.user_high === userId;
  if (!allowed) return { messages: [], meta: null };

  const peerId = conv.user_low === userId ? (conv.user_high as string) : (conv.user_low as string);
  const { data: prof } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", peerId)
    .maybeSingle();

  const { data: messages } = await supabase
    .from("friend_messages")
    .select("id, sender_id, body, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  return {
    messages: (messages ?? []) as FriendMessageRow[],
    meta: {
      id: conv.id as string,
      peerId,
      peerName: prof?.display_name?.trim() || "Friend",
      peerAvatar: (prof?.avatar_url as string | null) ?? null,
      last_message_at: conv.last_message_at as string,
    },
  };
}

export type WatchPartyDetail = {
  id: string;
  inviteCode: string;
  title: string;
  hostId: string;
  hostName: string;
  eventId: string | null;
  eventSlug: string | null;
  artistSlug: string | null;
  status: string;
  members: { userId: string; displayName: string }[];
};

export type WatchPartyMessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export async function getWatchPartyByCode(
  code: string,
  userId: string
): Promise<WatchPartyDetail | null> {
  if (!isSupabaseConfigured()) {
    return {
      id: "party-1",
      inviteCode: code.toUpperCase(),
      title: "Demo watch party",
      hostId: userId,
      hostName: "You",
      eventId: null,
      eventSlug: null,
      artistSlug: null,
      status: "open",
      members: [{ userId, displayName: "You" }],
    };
  }

  const supabase = await createClient();
  const { data: party } = await supabase
    .from("watch_parties")
    .select("id, invite_code, title, host_id, event_id, status, events(slug, artists(slug))")
    .eq("invite_code", code.toUpperCase())
    .maybeSingle();

  if (!party) return null;

  const { data: memberRows } = await supabase
    .from("watch_party_members")
    .select("user_id, profiles(display_name)")
    .eq("party_id", party.id);

  const members = (memberRows ?? []).map((m) => {
    const prof = m.profiles as { display_name: string | null } | { display_name: string | null }[];
    const p = Array.isArray(prof) ? prof[0] : prof;
    return {
      userId: m.user_id as string,
      displayName: p?.display_name?.trim() || "Member",
    };
  });

  const { data: hostProf } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", party.host_id)
    .maybeSingle();

  const evRaw = party.events as
    | { slug: string; artists: { slug: string } | { slug: string }[] }
    | { slug: string; artists: { slug: string } | { slug: string }[] }[]
    | null;
  const ev = evRaw ? (Array.isArray(evRaw) ? evRaw[0] : evRaw) : null;
  const artist = ev?.artists
    ? Array.isArray(ev.artists)
      ? ev.artists[0]
      : ev.artists
    : null;

  return {
    id: party.id as string,
    inviteCode: party.invite_code as string,
    title: party.title as string,
    hostId: party.host_id as string,
    hostName: hostProf?.display_name?.trim() || "Host",
    eventId: (party.event_id as string | null) ?? null,
    eventSlug: ev?.slug ?? null,
    artistSlug: artist?.slug ?? null,
    status: party.status as string,
    members,
  };
}

export async function getWatchPartyMessages(partyId: string, limit = 100): Promise<WatchPartyMessageRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("watch_party_messages")
    .select("id, sender_id, body, created_at")
    .eq("party_id", partyId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as WatchPartyMessageRow[];
}
