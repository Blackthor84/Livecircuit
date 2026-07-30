import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateTouringAccess, mergeTouringIntoAccessMessage } from "@/lib/virtual-touring/access";
import type { LiveAccessState } from "@/lib/live/access";

type TouringEventRow = {
  tour_city: string | null;
  tour_state_code: string | null;
  tour_state_name: string | null;
  doors_open_at: string | null;
  show_starts_at: string | null;
  audience_mode: import("@/types/database").EventAudienceMode;
  local_priority_minutes: number;
  artist_id: string;
  invite_code: string | null;
};

export async function applyVirtualTouringAccess(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  access: LiveAccessState
): Promise<LiveAccessState & { isHomeCrowd?: boolean; canAccessLocalChat?: boolean }> {
  const { data: event } = await supabase
    .from("events")
    .select(
      "tour_city, tour_state_code, tour_state_name, doors_open_at, show_starts_at, audience_mode, local_priority_minutes, artist_id, invite_code"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return access;

  const row = event as TouringEventRow;

  const [{ data: profile }, { data: invite }] = await Promise.all([
    supabase
      .from("profiles")
      .select("cities(name), states(code), countries(code)")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("event_invites")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const city = profile?.cities as { name: string } | { name: string }[] | null;
  const state = profile?.states as { code: string } | { code: string }[] | null;
  const country = profile?.countries as { code: string } | { code: string }[] | null;

  const touring = evaluateTouringAccess({
    tourCity: row.tour_city,
    tourStateCode: row.tour_state_code,
    tourStateName: row.tour_state_name,
    audienceMode: row.audience_mode ?? "worldwide",
    localPriorityMinutes: row.local_priority_minutes ?? 30,
    doorsOpenAt: row.doors_open_at,
    showStartsAt: row.show_starts_at ?? access.scheduledAt,
    inviteCode: row.invite_code,
    profile: {
      cityName: Array.isArray(city) ? city[0]?.name : city?.name,
      stateCode: Array.isArray(state) ? state[0]?.code : state?.code,
      countryCode: Array.isArray(country) ? country[0]?.code : country?.code,
    },
    hasTicket: access.hasTicket,
    isVip: access.isVip,
    isSubscriber: access.isVip,
    isInvited: Boolean(invite),
  });

  if (!touring.allowed && access.mode !== "host" && access.mode !== "observer") {
    return {
      ...access,
      mode: "denied",
      canWatchStream: false,
      canChat: false,
      message: mergeTouringIntoAccessMessage(touring, access.message),
      isHomeCrowd: touring.isHomeCrowd,
      canAccessLocalChat: touring.canAccessLocalChat,
    };
  }

  return {
    ...access,
    message: mergeTouringIntoAccessMessage(touring, access.message),
    isHomeCrowd: touring.isHomeCrowd,
    canAccessLocalChat: touring.canAccessLocalChat && touring.allowed,
  };
}
