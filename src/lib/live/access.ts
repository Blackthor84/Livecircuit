import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { EventStatus } from "@/types/database";

export type LiveAccessMode = "host" | "viewer" | "waiting" | "denied";

export type LiveAccessState = {
  mode: LiveAccessMode;
  canWatchStream: boolean;
  canChat: boolean;
  canModerate: boolean;
  isVip: boolean;
  hasTicket: boolean;
  status: EventStatus;
  scheduledAt: string;
  secondsUntilStart: number;
  message: string | null;
};

type EventRow = {
  id: string;
  artist_id: string;
  status: EventStatus;
  scheduled_at: string;
  artists?: { user_id: string } | { user_id: string }[] | null;
};

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
    };
  }

  const { data: eventRaw } = await supabase
    .from("events")
    .select("id, artist_id, status, scheduled_at, artists(user_id)")
    .eq("id", eventId)
    .maybeSingle();

  const event = eventRaw as EventRow | null;
  if (!event) {
    return deniedState("scheduled", new Date().toISOString(), "Event not found");
  }

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
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  if (isAdmin || (artistUserId && artistUserId === userId)) {
    return hostState(event.status, scheduledAt, secondsUntilStart);
  }

  const [{ data: ticket }, { data: vip }, { data: backstageSub }, { data: mute }, coHost] =
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
  ]);

  if (coHost) {
    return hostState(event.status, scheduledAt, secondsUntilStart);
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
      };
    }
  }

  if (event.status === "ended" || event.status === "cancelled") {
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
  };
}

function hostState(status: EventStatus, scheduledAt: string, secondsUntilStart: number): LiveAccessState {
  return {
    mode: "host",
    canWatchStream: status === "live" || status === "scheduled" || status === "draft",
    canChat: true,
    canModerate: true,
    isVip: true,
    hasTicket: true,
    status,
    scheduledAt,
    secondsUntilStart,
    message: null,
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
