import { EVENT_AUDIENCE_MODES } from "@/lib/virtual-touring/constants";
import { profileIsUnitedStates, profileMatchesStop } from "@/lib/virtual-touring/location";
import type { FanProfileLocation, TouringEventContext, VirtualTouringAccessResult } from "@/lib/virtual-touring/types";
import type { EventAudienceMode } from "@/types/database";

export type AudienceCheckInput = TouringEventContext & {
  profile: FanProfileLocation | null;
  hasTicket: boolean;
  isVip: boolean;
  isSubscriber: boolean;
  isInvited: boolean;
  now?: Date;
};

export function audienceModeLabel(mode: EventAudienceMode): string {
  return EVENT_AUDIENCE_MODES.find((m) => m.value === mode)?.label ?? mode;
}

export function evaluateTouringAccess(input: AudienceCheckInput): VirtualTouringAccessResult {
  const now = input.now ?? new Date();
  const mode = input.audienceMode ?? "worldwide";
  const isHomeCrowd = profileMatchesStop(input.profile ?? {}, input);
  const doorsOpen = input.doorsOpenAt ? new Date(input.doorsOpenAt) : null;
  const showStarts = input.showStartsAt ? new Date(input.showStartsAt) : null;
  const priorityMinutes = input.localPriorityMinutes ?? 30;

  const priorityOpensAt = doorsOpen?.toISOString() ?? null;
  const publicOpensAt =
    mode === "local_priority" && doorsOpen
      ? new Date(doorsOpen.getTime() + priorityMinutes * 60_000).toISOString()
      : priorityOpensAt;

  const inPriorityWindow =
    mode === "local_priority" &&
    doorsOpen != null &&
    now.getTime() >= doorsOpen.getTime() &&
    publicOpensAt != null &&
    now.getTime() < new Date(publicOpensAt).getTime();

  const base = {
    isHomeCrowd,
    canAccessLocalChat: isHomeCrowd,
    inPriorityWindow,
    priorityOpensAt,
    publicOpensAt,
    audienceMode: mode,
  };

  if (mode === "vip_only" && !input.isVip) {
    return {
      ...base,
      allowed: false,
      denialMessage: "This stop is VIP only.",
    };
  }

  if (mode === "subscribers_only" && !input.isSubscriber && !input.isVip) {
    return {
      ...base,
      allowed: false,
      denialMessage: "This stop is for subscribers only.",
    };
  }

  if (mode === "invite_only" && !input.isInvited && !input.isVip) {
    return {
      ...base,
      allowed: false,
      denialMessage: "This is an invite-only stop.",
    };
  }

  if (mode === "us_only" && !profileIsUnitedStates(input.profile ?? {})) {
    return {
      ...base,
      allowed: false,
      denialMessage: "This stop is limited to fans in the United States.",
    };
  }

  if (mode === "local_only" && !isHomeCrowd) {
    const place = [input.tourCity, input.tourStateName].filter(Boolean).join(", ");
    return {
      ...base,
      allowed: false,
      denialMessage: `This event is currently limited to fans in ${place || "this tour stop"}.`,
    };
  }

  if (mode === "local_priority" && inPriorityWindow && !isHomeCrowd) {
    const place = [input.tourCity, input.tourStateName].filter(Boolean).join(", ");
    const opensLabel = publicOpensAt
      ? new Date(publicOpensAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : "soon";
    return {
      ...base,
      allowed: false,
      denialMessage: `Home Crowd priority for ${place || "local fans"} — opens to everyone at ${opensLabel}.`,
    };
  }

  void showStarts;

  return {
    ...base,
    allowed: true,
    denialMessage: null,
  };
}

export function mergeTouringIntoAccessMessage(
  touring: VirtualTouringAccessResult,
  fallback: string | null
): string | null {
  if (!touring.allowed && touring.denialMessage) return touring.denialMessage;
  return fallback;
}
