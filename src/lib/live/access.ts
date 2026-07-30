import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isObserverUser } from "@/lib/auth/observer";
import { isAdminRole } from "@/lib/auth/roles";
import { parseStreamMetadata, type RecordingStatus } from "@/lib/streaming/stream-metadata";
import { getEventProducerForUser } from "@/lib/data/producers";
import { hasProducerPermission } from "@/lib/production/permissions";
import type { ProducerPermissions } from "@/lib/production/types";
import type { EventStatus } from "@/types/database";

export type LiveAccessMode = "host" | "producer" | "viewer" | "waiting" | "replay" | "denied" | "observer";

export type LiveAccessState = {
  mode: LiveAccessMode;
  canWatchStream: boolean;
  canChat: boolean;
  canModerate: boolean;
  canBackstageChat?: boolean;
  isVip: boolean;
  hasTicket: boolean;
  status: EventStatus;
  scheduledAt: string;
  secondsUntilStart: number;
  message: string | null;
  recordingUrl: string | null;
  recordingStatus: RecordingStatus;
  isHomeCrowd?: boolean;
  canAccessLocalChat?: boolean;
  producerPermissions?: Record<string, boolean>;
  producerStaffRole?: string;
};

type EventRow = {
  id: string;
  artist_id: string;
  status: EventStatus;
  scheduled_at: string;
  artists?: { user_id: string } | { user_id: string }[] | null;
  streams?:
    | { recording_url: string | null; metadata: unknown }
    | { recording_url: string | null; metadata: unknown }[]
    | null;
};

function streamState(event: EventRow) {
  const raw = event.streams;
  const stream = Array.isArray(raw) ? raw[0] : raw;
  const metadata = parseStreamMetadata(stream?.metadata);
  const recordingUrl = (stream?.recording_url as string | null) ?? null;
  const recordingStatus =
    metadata.recording_status ?? (recordingUrl ? "ready" : "none");
  return { recordingUrl, recordingStatus };
}

export async function getEventLiveAccess(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  eventId: string,
  demoFallback?: { status: EventStatus; scheduled_at: string }
): Promise<LiveAccessState> {
  if (!isSupabaseConfigured()) {
    const status = demoFallback?.status ?? "scheduled";
    const scheduledAt = demoFallback?.scheduled_at ?? new Date().toISOString();
    const secondsUntilStart = Math.max(
      0,
      Math.floor((new Date(scheduledAt).getTime() - Date.now()) / 1000)
    );
    return {
      mode: status === "live" ? "viewer" : "waiting",
      canWatchStream: status === "live",
      canChat: true,
      canModerate: false,
      isVip: false,
      hasTicket: true,
      status,
      scheduledAt,
      secondsUntilStart,
      message: null,
      recordingUrl: null,
      recordingStatus: "none",
    };
  }

  const { data: eventRaw } = await supabase
    .from("events")
    .select("id, artist_id, status, scheduled_at, artists(user_id), streams(recording_url, metadata)")
    .eq("id", eventId)
    .maybeSingle();

  const event = eventRaw as EventRow | null;
  if (!event) {
    return deniedState("scheduled", new Date().toISOString(), "Event not found");
  }

  const recording = streamState(event);

  const artists = event.artists;
  const artistUserId = Array.isArray(artists) ? artists[0]?.user_id : artists?.user_id;

  const scheduledAt = event.scheduled_at;
  const secondsUntilStart = Math.max(
    0,
    Math.floor((new Date(scheduledAt).getTime() - Date.now()) / 1000)
  );

  if (!userId) {
    return {
      ...deniedState(event.status, scheduledAt, "Sign in and get a ticket to join the room"),
      secondsUntilStart,
      ...recording,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const isAdmin = isAdminRole(profile?.role);

  if (isAdmin || (artistUserId && artistUserId === userId)) {
    return hostState(event.status, scheduledAt, secondsUntilStart, recording);
  }

  if (await isObserverUser(userId)) {
    return observerState(event.status, scheduledAt, secondsUntilStart, recording);
  }

  const [{ data: ticket }, { data: vip }, { data: backstageSub }, { data: mute }, coHost, banned] =
    await Promise.all([
    supabase
      .from("tickets")
      .select("id, tier")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("vip_memberships")
      .select("id, active, expires_at")
      .eq("artist_id", event.artist_id)
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("backstage_subscriptions")
      .select("id, status, current_period_end")
      .eq("artist_id", event.artist_id)
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .maybeSingle(),
    supabase
      .from("event_chat_mutes")
      .select("id, expires_at")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("event_hosts")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("event_chat_bans")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (banned) {
    return deniedState(event.status, scheduledAt, "You have been removed from this event");
  }

  if (coHost) {
    return hostState(event.status, scheduledAt, secondsUntilStart, recording);
  }

  const producer = await getEventProducerForUser(supabase, eventId, userId);
  if (producer) {
    return producerState(
      event.status,
      scheduledAt,
      secondsUntilStart,
      recording,
      producer.permissions as ProducerPermissions,
      producer.staff_role
    );
  }

  const backstageActive =
    Boolean(backstageSub) &&
    (!backstageSub?.current_period_end ||
      new Date(backstageSub.current_period_end as string).getTime() > Date.now());

  const vipActive =
    backstageActive ||
    (Boolean(vip) &&
      (!vip?.expires_at || new Date(vip.expires_at as string).getTime() > Date.now()));
  const hasTicket = Boolean(ticket);
  const isVip = vipActive || ticket?.tier === "vip";

  if (!hasTicket && !vipActive) {
    return {
      ...deniedState(
        event.status,
        scheduledAt,
        "Purchase a ticket or VIP to enter the waiting room"
      ),
      secondsUntilStart,
      hasTicket: false,
      isVip: false,
      ...recording,
    };
  }

  if (mute) {
    const expired =
      mute.expires_at && new Date(mute.expires_at as string).getTime() <= Date.now();
    if (!expired) {
      return {
        mode: "denied",
        canWatchStream: event.status === "live",
        canChat: false,
        canModerate: false,
        isVip,
        hasTicket,
        status: event.status,
        scheduledAt,
        secondsUntilStart,
        message: "You are muted in this room",
        ...recording,
      };
    }
  }

  if (event.status === "cancelled") {
    return {
      mode: "denied",
      canWatchStream: false,
      canChat: false,
      canModerate: false,
      isVip,
      hasTicket,
      status: event.status,
      scheduledAt,
      secondsUntilStart,
      message: "This event was cancelled",
      ...recording,
    };
  }

  if (event.status === "ended") {
    if (recording.recordingUrl) {
      return {
        mode: "replay",
        canWatchStream: true,
        canChat: false,
        canModerate: false,
        isVip,
        hasTicket,
        status: event.status,
        scheduledAt,
        secondsUntilStart,
        message: null,
        ...recording,
      };
    }

    if (recording.recordingStatus === "processing") {
      return {
        mode: "replay",
        canWatchStream: false,
        canChat: false,
        canModerate: false,
        isVip,
        hasTicket,
        status: event.status,
        scheduledAt,
        secondsUntilStart,
        message: "Replay is processing — check back soon",
        ...recording,
      };
    }

    return {
      mode: "denied",
      canWatchStream: false,
      canChat: false,
      canModerate: false,
      isVip,
      hasTicket,
      status: event.status,
      scheduledAt,
      secondsUntilStart,
      message: "This event has ended",
      ...recording,
    };
  }

  if (event.status === "live") {
    return {
      mode: "viewer",
      canWatchStream: true,
      canChat: true,
      canModerate: false,
      isVip,
      hasTicket,
      status: event.status,
      scheduledAt,
      secondsUntilStart,
      message: null,
      ...recording,
    };
  }

  return {
    mode: "waiting",
    canWatchStream: false,
    canChat: true,
    canModerate: false,
    isVip,
    hasTicket,
    status: event.status,
    scheduledAt,
    secondsUntilStart,
    message: null,
    ...recording,
  };
}

function observerState(
  status: EventStatus,
  scheduledAt: string,
  secondsUntilStart: number,
  recording: { recordingUrl: string | null; recordingStatus: RecordingStatus }
): LiveAccessState {
  const canWatch =
    status === "live" ||
    status === "scheduled" ||
    status === "draft" ||
    (status === "ended" && Boolean(recording.recordingUrl));

  return {
    mode: "observer",
    canWatchStream: canWatch,
    canChat: false,
    canModerate: false,
    isVip: false,
    hasTicket: false,
    status,
    scheduledAt,
    secondsUntilStart,
    message: "Internal observer mode — not counted in public metrics",
    ...recording,
  };
}

function producerState(
  status: EventStatus,
  scheduledAt: string,
  secondsUntilStart: number,
  recording: { recordingUrl: string | null; recordingStatus: RecordingStatus },
  permissions: ProducerPermissions,
  staffRole: string
): LiveAccessState {
  const canMod =
    hasProducerPermission(permissions, "delete_chat") ||
    hasProducerPermission(permissions, "mute_users") ||
    hasProducerPermission(permissions, "ban_users");

  return {
    mode: "producer",
    canWatchStream:
      status === "live" ||
      status === "scheduled" ||
      status === "draft" ||
      (status === "ended" && Boolean(recording.recordingUrl)),
    canChat: true,
    canModerate: canMod,
    canBackstageChat: true,
    isVip: true,
    hasTicket: true,
    status,
    scheduledAt,
    secondsUntilStart,
    message: null,
    producerPermissions: permissions as Record<string, boolean>,
    producerStaffRole: staffRole,
    ...recording,
  };
}

function hostState(
  status: EventStatus,
  scheduledAt: string,
  secondsUntilStart: number,
  recording: { recordingUrl: string | null; recordingStatus: RecordingStatus }
): LiveAccessState {
  return {
    mode: "host",
    canWatchStream: status === "live" || status === "scheduled" || status === "draft" || status === "ended",
    canChat: true,
    canModerate: true,
    canBackstageChat: true,
    isVip: true,
    hasTicket: true,
    status,
    scheduledAt,
    secondsUntilStart,
    message: null,
    ...recording,
  };
}

function deniedState(
  status: EventStatus,
  scheduledAt: string,
  message: string
): LiveAccessState {
  return {
    mode: "denied",
    canWatchStream: false,
    canChat: false,
    canModerate: false,
    isVip: false,
    hasTicket: false,
    status,
    scheduledAt,
    secondsUntilStart: 0,
    message,
    recordingUrl: null,
    recordingStatus: "none",
  };
}

export async function isUserMutedInEvent(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
) {
  const { data: mute } = await supabase
    .from("event_chat_mutes")
    .select("expires_at")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!mute) return false;
  if (mute.expires_at && new Date(mute.expires_at as string).getTime() <= Date.now()) {
    return false;
  }
  return true;
}
