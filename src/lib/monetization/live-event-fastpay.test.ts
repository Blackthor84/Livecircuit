import { describe, expect, it } from "vitest";
import {
  fastPayCancelReason,
  validateCancelLiveEvent,
  validateEndLiveTransition,
} from "@/lib/monetization/live-event-fastpay";

describe("validateEndLiveTransition", () => {
  it("rejects cancelled events", () => {
    expect(
      validateEndLiveTransition({
        status: "cancelled",
        started_at: null,
        ended_at: null,
      }).ok,
    ).toBe(false);
  });

  it("allows idempotent re-end when already ended", () => {
    const r = validateEndLiveTransition({
      status: "ended",
      started_at: "2026-06-01T01:00:00Z",
      ended_at: "2026-06-01T03:00:00Z",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.alreadyEnded).toBe(true);
  });

  it("requires live status and started_at", () => {
    expect(
      validateEndLiveTransition({
        status: "scheduled",
        started_at: null,
        ended_at: null,
      }).ok,
    ).toBe(false);
    expect(
      validateEndLiveTransition({
        status: "live",
        started_at: null,
        ended_at: null,
      }).ok,
    ).toBe(false);
    expect(
      validateEndLiveTransition({
        status: "live",
        started_at: "2026-06-01T01:00:00Z",
        ended_at: null,
      }).ok,
    ).toBe(true);
  });
});

describe("validateCancelLiveEvent", () => {
  it("rejects cancelling completed events", () => {
    expect(
      validateCancelLiveEvent({
        status: "ended",
        started_at: "x",
        ended_at: "y",
      }).ok,
    ).toBe(false);
  });

  it("is idempotent when already cancelled", () => {
    expect(
      validateCancelLiveEvent({
        status: "cancelled",
        started_at: null,
        ended_at: null,
      }).ok,
    ).toBe(true);
  });
});

describe("fastPayCancelReason", () => {
  it("distinguishes before and after start", () => {
    expect(
      fastPayCancelReason({ status: "cancelled", started_at: null, ended_at: null }),
    ).toBe("cancelled_before_start");
    expect(
      fastPayCancelReason({
        status: "cancelled",
        started_at: "2026-06-01T01:00:00Z",
        ended_at: null,
      }),
    ).toBe("cancelled_after_start");
  });
});
