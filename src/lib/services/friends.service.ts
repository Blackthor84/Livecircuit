import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalFriendPair } from "@/lib/services/friends-pair";
import type {
  FriendActivityItem,
  FriendProfile,
  FriendRecommendation,
  FriendRequest,
  FriendsHubReport,
  SharedEventItem,
  WatchPartySummary,
} from "@/lib/types/friends";

const ONLINE_MS = 5 * 60 * 1000;
const AWAY_MS = 30 * 60 * 1000;

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapPresence(lastSeenAt: string | null | undefined): FriendProfile["presence"] {
  if (!lastSeenAt) return "offline";
  const age = Date.now() - new Date(lastSeenAt).getTime();
  if (age <= ONLINE_MS) return "online";
  if (age <= AWAY_MS) return "away";
  return "offline";
}

async function loadProfiles(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, { display_name: string | null; avatar_url: string | null }>> {
  if (!ids.length) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids);
  return new Map((data ?? []).map((p) => [p.id as string, p]));
}

async function loadPresenceMap(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, { status: string; last_seen_at: string }>();
  const { data } = await supabase.from("user_presence").select("user_id, status, last_seen_at").in("user_id", ids);
  return new Map(
    (data ?? []).map((r) => [
      r.user_id as string,
      { status: r.status as string, last_seen_at: r.last_seen_at as string },
    ])
  );
}

export async function touchUserPresence(supabase: SupabaseClient, userId: string) {
  const now = new Date().toISOString();
  await supabase.from("user_presence").upsert(
    { user_id: userId, status: "online", last_seen_at: now },
    { onConflict: "user_id" }
  );
}

async function acceptedFriendIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq("status", "accepted");

  const ids: string[] = [];
  for (const row of data ?? []) {
    const other =
      row.requester_id === userId ? (row.addressee_id as string) : (row.requester_id as string);
    ids.push(other);
  }
  return ids;
}

async function mutualCount(supabase: SupabaseClient, userId: string, otherId: string) {
  const [mine, theirs] = await Promise.all([
    acceptedFriendIds(supabase, userId),
    acceptedFriendIds(supabase, otherId),
  ]);
  const set = new Set(theirs);
  return mine.filter((id) => set.has(id)).length;
}

function toFriendProfile(
  userId: string,
  profile: { display_name: string | null; avatar_url: string | null } | undefined,
  presenceRow: { status: string; last_seen_at: string } | undefined,
  mutualFriends: number
): FriendProfile {
  const lastSeen = presenceRow?.last_seen_at ?? null;
  const presence =
    presenceRow?.status === "online" ? mapPresence(lastSeen) : mapPresence(lastSeen);
  return {
    userId,
    displayName: profile?.display_name?.trim() || "Fan",
    avatarUrl: profile?.avatar_url ?? null,
    presence,
    lastSeenAt: lastSeen,
    mutualFriends,
  };
}

export async function buildFriendsHubReport(
  supabase: SupabaseClient,
  userId: string
): Promise<FriendsHubReport> {
  await touchUserPresence(supabase, userId);

  const [{ data: friendshipRows }, { count: followingCount }, { count: followersCount }] =
    await Promise.all([
      supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status, created_at")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order("created_at", { ascending: false }),
      supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
      supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    ]);

  const friendIds = new Set<string>();
  const incoming: FriendRequest[] = [];
  const outgoing: FriendRequest[] = [];
  const pendingOrBlocked = new Set<string>();

  for (const row of friendshipRows ?? []) {
    const status = row.status as string;
    const otherId =
      row.requester_id === userId ? (row.addressee_id as string) : (row.requester_id as string);
    if (status === "accepted") friendIds.add(otherId);
    else pendingOrBlocked.add(otherId);
    if (status === "pending") {
      const direction = row.requester_id === userId ? "outgoing" : "incoming";
      pendingOrBlocked.add(otherId);
      const stub: FriendRequest = {
        id: row.id as string,
        from: {
          userId: otherId,
          displayName: "",
          avatarUrl: null,
          presence: "offline",
          lastSeenAt: null,
          mutualFriends: 0,
        },
        createdAt: row.created_at as string,
        direction,
      };
      if (direction === "incoming") incoming.push(stub);
      else outgoing.push(stub);
    }
  }

  const relatedIds = [
    ...new Set([
      ...friendIds,
      ...incoming.map((r) => r.from.userId),
      ...outgoing.map((r) => r.from.userId),
    ]),
  ];

  const [profiles, presenceMap] = await Promise.all([
    loadProfiles(supabase, relatedIds),
    loadPresenceMap(supabase, relatedIds),
  ]);

  const friends: FriendProfile[] = [];
  for (const fid of friendIds) {
    const mutual = await mutualCount(supabase, userId, fid);
    friends.push(
      toFriendProfile(fid, profiles.get(fid), presenceMap.get(fid), mutual)
    );
  }
  friends.sort((a, b) => a.displayName.localeCompare(b.displayName));

  for (const req of [...incoming, ...outgoing]) {
    const pid = req.from.userId;
    const mutual = await mutualCount(supabase, userId, pid);
    req.from = toFriendProfile(pid, profiles.get(pid), presenceMap.get(pid), mutual);
  }

  const friendIdList = [...friendIds];
  let activity: FriendActivityItem[] = [];
  if (friendIdList.length) {
    const { data: actRows } = await supabase
      .from("friend_activity_events")
      .select("id, actor_id, verb, summary, created_at")
      .in("actor_id", friendIdList)
      .order("created_at", { ascending: false })
      .limit(25);

    const actorIds = [...new Set((actRows ?? []).map((r) => r.actor_id as string))];
    const actorProfiles = await loadProfiles(supabase, actorIds);

    activity = (actRows ?? []).map((r) => ({
      id: r.id as string,
      actorName: actorProfiles.get(r.actor_id as string)?.display_name?.trim() || "Friend",
      verb: r.verb as string,
      summary: r.summary as string,
      createdAt: r.created_at as string,
    }));
  }

  const sharedEvents = await loadSharedEvents(supabase, userId, friendIdList, profiles);

  const recommendations = await loadRecommendations(
    supabase,
    userId,
    friendIds,
    pendingOrBlocked
  );

  const watchParties = await loadWatchPartiesForUser(supabase, userId);

  return {
    friends,
    incoming,
    outgoing,
    followingCount: followingCount ?? 0,
    followersCount: followersCount ?? 0,
    activity,
    sharedEvents,
    recommendations,
    watchParties,
    computedAt: new Date().toISOString(),
  };
}

async function loadSharedEvents(
  supabase: SupabaseClient,
  userId: string,
  friendIds: string[],
  profiles: Map<string, { display_name: string | null; avatar_url: string | null }>
): Promise<SharedEventItem[]> {
  if (!friendIds.length) return [];

  const now = new Date().toISOString();
  const { data: myTickets } = await supabase
    .from("tickets")
    .select("event_id, events(id, slug, title, scheduled_at, artists(slug))")
    .eq("user_id", userId);

  const myEventIds = new Set(
    (myTickets ?? []).map((t) => t.event_id as string).filter(Boolean)
  );
  if (!myEventIds.size) return [];

  const { data: friendTickets } = await supabase
    .from("tickets")
    .select("user_id, event_id, events(id, slug, title, scheduled_at, artists(slug))")
    .in("user_id", friendIds)
    .in("event_id", [...myEventIds]);

  const items: SharedEventItem[] = [];
  const seen = new Set<string>();
  for (const row of friendTickets ?? []) {
    const ev = first(
      row.events as unknown as {
        id: string;
        slug: string;
        title: string;
        scheduled_at: string;
        artists: { slug: string } | { slug: string }[];
      } | null
    );
    if (!ev || ev.scheduled_at < now) continue;
    const key = `${row.user_id}:${ev.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const artist = first(ev.artists);
    items.push({
      eventId: ev.id,
      eventTitle: ev.title,
      eventSlug: ev.slug,
      artistSlug: artist?.slug ?? "",
      scheduledAt: ev.scheduled_at,
      friendName: profiles.get(row.user_id as string)?.display_name?.trim() || "Friend",
    });
  }
  items.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return items.slice(0, 12);
}

async function loadRecommendations(
  supabase: SupabaseClient,
  userId: string,
  friendIds: Set<string>,
  exclude: Set<string>
): Promise<FriendRecommendation[]> {
  const myFriends = await acceptedFriendIds(supabase, userId);
  const candidateScores = new Map<string, { score: number; reason: string }>();

  for (const fid of myFriends) {
    const { data: theirFriends } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${fid},addressee_id.eq.${fid}`)
      .eq("status", "accepted");

    for (const row of theirFriends ?? []) {
      const cand =
        row.requester_id === fid ? (row.addressee_id as string) : (row.requester_id as string);
      if (cand === userId || friendIds.has(cand) || exclude.has(cand)) continue;
      const cur = candidateScores.get(cand);
      if (cur) {
        cur.score += 1;
      } else {
        candidateScores.set(cand, { score: 1, reason: "Mutual friends on LiveCircuit" });
      }
    }
  }

  const sorted = [...candidateScores.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 8);

  if (!sorted.length) return [];

  const ids = sorted.map(([id]) => id);
  const [profiles, presenceMap] = await Promise.all([
    loadProfiles(supabase, ids),
    loadPresenceMap(supabase, ids),
  ]);

  const out: FriendRecommendation[] = [];
  for (const [id, meta] of sorted) {
    const mutual = await mutualCount(supabase, userId, id);
    out.push({
      ...toFriendProfile(id, profiles.get(id), presenceMap.get(id), mutual),
      reason: meta.reason,
    });
  }
  return out;
}

async function loadWatchPartiesForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<WatchPartySummary[]> {
  const { data: memberships } = await supabase
    .from("watch_party_members")
    .select("party_id")
    .eq("user_id", userId);

  const partyIds = [...new Set((memberships ?? []).map((m) => m.party_id as string))];
  if (!partyIds.length) {
    const { data: hosted } = await supabase
      .from("watch_parties")
      .select("id")
      .eq("host_id", userId)
      .eq("status", "open")
      .limit(5);
    for (const h of hosted ?? []) partyIds.push(h.id as string);
  }

  if (!partyIds.length) return [];

  const { data: parties } = await supabase
    .from("watch_parties")
    .select("id, invite_code, title, host_id, event_id, status")
    .in("id", partyIds)
    .in("status", ["open", "live"])
    .order("created_at", { ascending: false })
    .limit(10);

  const hostIds = [...new Set((parties ?? []).map((p) => p.host_id as string))];
  const hosts = await loadProfiles(supabase, hostIds);

  const summaries: WatchPartySummary[] = [];
  for (const p of parties ?? []) {
    const { count } = await supabase
      .from("watch_party_members")
      .select("*", { count: "exact", head: true })
      .eq("party_id", p.id);

    summaries.push({
      id: p.id as string,
      inviteCode: p.invite_code as string,
      title: p.title as string,
      hostName: hosts.get(p.host_id as string)?.display_name?.trim() || "Host",
      memberCount: count ?? 0,
      eventId: (p.event_id as string | null) ?? null,
    });
  }
  return summaries;
}

export async function ensureFriendConversation(
  supabase: SupabaseClient,
  userId: string,
  peerId: string
): Promise<string | null> {
  const { userLow, userHigh } = canonicalFriendPair(userId, peerId);
  const { data: existing } = await supabase
    .from("friend_conversations")
    .select("id")
    .eq("user_low", userLow)
    .eq("user_high", userHigh)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from("friend_conversations")
    .insert({ user_low: userLow, user_high: userHigh })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

export async function recordFriendActivity(
  supabase: SupabaseClient,
  actorId: string,
  verb: string,
  summary: string,
  metadata: Record<string, unknown> = {}
) {
  await supabase.from("friend_activity_events").insert({
    actor_id: actorId,
    verb,
    summary,
    metadata,
  });
}

export function randomInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
