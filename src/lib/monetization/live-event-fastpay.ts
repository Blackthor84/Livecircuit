/** Pure FastPay / live-event transition rules (testable, no I/O). */

export type LiveEventSnapshot = {
  status: string;
  started_at: string | null;
  ended_at: string | null;
};

export type EndLiveValidation =
  | { ok: true; alreadyEnded: boolean }
  | { ok: false; error: string };

export function validateEndLiveTransition(event: LiveEventSnapshot): EndLiveValidation {
  if (event.status === "cancelled") {
    return { ok: false, error: "This event was cancelled and cannot be marked completed." };
  }
  if (event.status === "ended" && event.ended_at) {
    return { ok: true, alreadyEnded: true };
  }
  if (event.status !== "live") {
    return { ok: false, error: "The event must be live before it can be ended." };
  }
  if (!event.started_at) {
    return { ok: false, error: "The event must have started before it can be completed." };
  }
  return { ok: true, alreadyEnded: false };
}

export function validateCancelLiveEvent(event: LiveEventSnapshot): { ok: true } | { ok: false; error: string } {
  if (event.status === "ended") {
    return { ok: false, error: "Completed events cannot be cancelled." };
  }
  if (event.status === "cancelled") {
    return { ok: true };
  }
  return { ok: true };
}

export type FastPayCancelReason = "cancelled_before_start" | "cancelled_after_start";

export function fastPayCancelReason(event: LiveEventSnapshot): FastPayCancelReason {
  return event.started_at ? "cancelled_after_start" : "cancelled_before_start";
}
