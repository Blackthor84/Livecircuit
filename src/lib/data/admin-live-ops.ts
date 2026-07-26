import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getMilestoneEnvStatus } from "@/lib/config/env";

export type LiveStreamRow = {
  eventId: string;
  title: string;
  status: string;
  viewerCount: number;
  peakViewers: number;
  artistName: string;
  artistSlug: string;
  startedAt: string | null;
  chatMessages30m: number;
  reactions30m: number;
  moderationActions24h: number;
};

export type LiveOperationsReport = {
  activeStreams: LiveStreamRow[];
  totalConcurrentViewers: number;
  systemHealth: ReturnType<typeof getMilestoneEnvStatus>;
  moderationBacklog: number;
  moderationActions24h: number;
  todos: string[];
};

export async function getAdminLiveOperations(): Promise<LiveOperationsReport> {
  const systemHealth = getMilestoneEnvStatus();
  const todos = [
    "Stream bitrate / packet-loss telemetry requires LiveKit webhook expansion.",
    "Venue concurrent visitors shown separately on venue ops tab.",
  ];

  if (!isSupabaseConfigured()) {
    return {
      activeStreams: [],
      totalConcurrentViewers: 0,
      systemHealth,
      moderationBacklog: 0,
      moderationActions24h: 0,
      todos,
    };
  }

  const supabase = await createClient();
  const since30m = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [eventsRes, reportsRes, moderationRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, status, viewer_count, peak_viewers, started_at, artists(stage_name, slug)")
      .in("status", ["live", "scheduled"])
      .order("viewer_count", { ascending: false })
      .limit(25),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "reviewing"]),
    supabase
      .from("moderation_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
  ]);

  const eventIds = (eventsRes.data ?? []).map((row) => row.id as string);
  let chatCounts = new Map<string, number>();
  let reactionCounts = new Map<string, number>();

  if (eventIds.length) {
    const [chatRes, reactionRes] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("event_id")
        .in("event_id", eventIds)
        .eq("is_deleted", false)
        .gte("created_at", since30m),
      supabase
        .from("reactions")
        .select("event_id")
        .in("event_id", eventIds)
        .gte("created_at", since30m),
    ]);

    for (const row of chatRes.data ?? []) {
      const id = row.event_id as string;
      chatCounts.set(id, (chatCounts.get(id) ?? 0) + 1);
    }
    for (const row of reactionRes.data ?? []) {
      const id = row.event_id as string;
      reactionCounts.set(id, (reactionCounts.get(id) ?? 0) + 1);
    }
  }

  const activeStreams: LiveStreamRow[] = (eventsRes.data ?? []).map((row) => {
    const artists = row.artists as { stage_name: string; slug: string } | { stage_name: string; slug: string }[] | null;
    const artist = Array.isArray(artists) ? artists[0] : artists;
    const eventId = row.id as string;
    return {
      eventId,
      title: row.title as string,
      status: row.status as string,
      viewerCount: row.viewer_count as number,
      peakViewers: row.peak_viewers as number,
      artistName: artist?.stage_name ?? "Artist",
      artistSlug: artist?.slug ?? "",
      startedAt: row.started_at as string | null,
      chatMessages30m: chatCounts.get(eventId) ?? 0,
      reactions30m: reactionCounts.get(eventId) ?? 0,
      moderationActions24h: 0,
    };
  });

  const totalConcurrentViewers = activeStreams
    .filter((row) => row.status === "live")
    .reduce((sum, row) => sum + row.viewerCount, 0);

  return {
    activeStreams,
    totalConcurrentViewers,
    systemHealth,
    moderationBacklog: reportsRes.count ?? 0,
    moderationActions24h: moderationRes.count ?? 0,
    todos,
  };
}
