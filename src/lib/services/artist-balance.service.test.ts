import { describe, expect, it, vi } from "vitest";
import { ArtistConnectNotReadyError } from "@/lib/services/artist-balance.service";

vi.mock("@/lib/stripe/connect", () => ({
  getArtistConnectStatus: vi.fn(),
}));

import { getArtistConnectStatus } from "@/lib/stripe/connect";
import { assertArtistConnectReadyForPaidTickets } from "@/lib/services/artist-balance.service";

describe("connect readiness for paid tickets", () => {
  it("TEST 4: rejects checkout when artist Connect is not ready", async () => {
    vi.mocked(getArtistConnectStatus).mockResolvedValue({
      status: "onboarding_incomplete",
      record: {
        stripe_account_id: "acct_123",
        stripe_onboarding_complete: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        stripe_payouts_manual: false,
        stripe_payouts_schedule: null,
        stripe_details_submitted: false,
        stripe_requirements_due: ["external_account"],
        stripe_connect_updated_at: null,
      },
    });

    await expect(assertArtistConnectReadyForPaidTickets({} as never, "artist-1")).rejects.toBeInstanceOf(
      ArtistConnectNotReadyError,
    );
  });

  it("returns verified stripe account id from server lookup", async () => {
    vi.mocked(getArtistConnectStatus).mockResolvedValue({
      status: "ready",
      record: {
        stripe_account_id: "acct_ready",
        stripe_onboarding_complete: true,
        stripe_charges_enabled: true,
        stripe_payouts_enabled: true,
        stripe_payouts_manual: true,
        stripe_payouts_schedule: "manual",
        stripe_details_submitted: true,
        stripe_requirements_due: [],
        stripe_connect_updated_at: "2026-08-12T00:00:00.000Z",
      },
    });

    await expect(assertArtistConnectReadyForPaidTickets({} as never, "artist-1")).resolves.toEqual({
      stripeAccountId: "acct_ready",
    });
  });
});
