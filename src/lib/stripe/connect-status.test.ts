import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import {
  deriveArtistConnectStatus,
  isArtistPayoutReady,
  mapStripeAccountToConnectFields,
  normalizeRequirementsDue,
  type ArtistConnectRecord,
} from "@/lib/stripe/connect-status";

function baseRecord(overrides: Partial<ArtistConnectRecord> = {}): ArtistConnectRecord {
  return {
    stripe_account_id: "acct_test_123",
    stripe_onboarding_complete: false,
    stripe_charges_enabled: false,
    stripe_payouts_enabled: false,
    stripe_payouts_manual: false,
    stripe_payouts_schedule: null,
    stripe_details_submitted: false,
    stripe_requirements_due: [],
    stripe_connect_updated_at: null,
    ...overrides,
  };
}

describe("connect-status", () => {
  it("returns not_connected without stripe_account_id", () => {
    expect(deriveArtistConnectStatus(baseRecord({ stripe_account_id: null }))).toBe("not_connected");
  });

  it("returns onboarding_incomplete before details are submitted", () => {
    expect(deriveArtistConnectStatus(baseRecord())).toBe("onboarding_incomplete");
  });

  it("returns verification_pending when details submitted but payouts not enabled", () => {
    expect(
      deriveArtistConnectStatus(
        baseRecord({
          stripe_details_submitted: true,
          stripe_charges_enabled: false,
          stripe_payouts_enabled: false,
        }),
      ),
    ).toBe("verification_pending");
  });

  it("does not treat details_submitted alone as ready", () => {
    expect(
      deriveArtistConnectStatus(
        baseRecord({
          stripe_details_submitted: true,
          stripe_charges_enabled: true,
          stripe_payouts_enabled: false,
        }),
      ),
    ).toBe("verification_pending");
  });

  it("returns ready only when charges and payouts are enabled with no due requirements", () => {
    expect(
      deriveArtistConnectStatus(
        baseRecord({
          stripe_details_submitted: true,
          stripe_charges_enabled: true,
          stripe_payouts_enabled: true,
          stripe_onboarding_complete: true,
        }),
      ),
    ).toBe("ready");
  });

  it("returns restricted when requirements remain after submission without capabilities", () => {
    expect(
      deriveArtistConnectStatus(
        baseRecord({
          stripe_details_submitted: true,
          stripe_requirements_due: ["individual.verification.document"],
        }),
      ),
    ).toBe("restricted");
  });

  it("maps Stripe account fields without trusting details_submitted as payout-ready", () => {
    const mapped = mapStripeAccountToConnectFields({
      id: "acct_123",
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: true,
      requirements: { currently_due: ["external_account"] },
    } as Stripe.Account);

    expect(mapped.stripe_details_submitted).toBe(true);
    expect(mapped.stripe_onboarding_complete).toBe(false);
    expect(mapped.stripe_requirements_due).toEqual(["external_account"]);
  });

  it("marks onboarding complete only when Stripe account can receive funds", () => {
    const mapped = mapStripeAccountToConnectFields({
      id: "acct_123",
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      settings: { payouts: { schedule: { interval: "manual" } } },
      requirements: { currently_due: [] },
    } as Stripe.Account);

    expect(mapped.stripe_onboarding_complete).toBe(true);
    expect(mapped.stripe_payouts_manual).toBe(true);
  });

  it("isArtistPayoutReady requires manual payout schedule", () => {
    expect(
      isArtistPayoutReady(
        "ready",
        baseRecord({
          stripe_charges_enabled: true,
          stripe_payouts_enabled: true,
          stripe_payouts_manual: true,
        }),
      ),
    ).toBe(true);

    expect(
      isArtistPayoutReady(
        "ready",
        baseRecord({
          stripe_charges_enabled: true,
          stripe_payouts_enabled: true,
          stripe_payouts_manual: false,
        }),
      ),
    ).toBe(false);
  });

  it("normalizes requirements due arrays", () => {
    expect(normalizeRequirementsDue(["a", 1, "b"])).toEqual(["a", "b"]);
  });
});
