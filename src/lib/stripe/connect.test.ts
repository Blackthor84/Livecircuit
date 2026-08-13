import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

const stripeMocks = vi.hoisted(() => ({
  accountsCreate: vi.fn(),
  accountsRetrieve: vi.fn(),
  accountsUpdate: vi.fn(),
  accountLinksCreate: vi.fn(),
  loginLinksCreate: vi.fn(),
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    accounts: {
      create: stripeMocks.accountsCreate,
      retrieve: stripeMocks.accountsRetrieve,
      update: stripeMocks.accountsUpdate,
      createLoginLink: stripeMocks.loginLinksCreate,
    },
    accountLinks: {
      create: stripeMocks.accountLinksCreate,
    },
  }),
}));

vi.mock("@/lib/config/env", () => ({
  getAppUrl: () => "https://example.test",
}));

import {
  beginArtistConnectOnboarding,
  resolveArtistIdForStripeAccount,
} from "@/lib/stripe/connect";

function mockSupabase(row: Record<string, unknown> | null) {
  return {
    from() {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: row, error: null }),
          }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      };
    },
  } as unknown as SupabaseClient;
}

describe("stripe connect service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripeMocks.accountsUpdate.mockResolvedValue({});
    stripeMocks.accountsCreate.mockResolvedValue({
      id: "acct_new",
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      requirements: { currently_due: ["external_account"] },
    });
    stripeMocks.accountsRetrieve.mockResolvedValue({
      id: "acct_existing",
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      settings: { payouts: { schedule: { interval: "manual" } } },
      requirements: { currently_due: [] },
    });
    stripeMocks.accountLinksCreate.mockResolvedValue({ url: "https://stripe.test/onboard" });
    stripeMocks.loginLinksCreate.mockResolvedValue({ url: "https://stripe.test/dashboard" });
  });

  it("creates a Connect account when the artist has none", async () => {
    const supabase = mockSupabase({
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
      stripe_payouts_manual: false,
      stripe_payouts_schedule: null,
      stripe_details_submitted: false,
      stripe_requirements_due: [],
      stripe_connect_updated_at: null,
    });

    const result = await beginArtistConnectOnboarding({
      supabase,
      artistId: "artist-1",
      email: "artist@example.test",
      displayName: "Nova Ray",
      mode: "onboarding",
    });

    expect(stripeMocks.accountsCreate).toHaveBeenCalledTimes(1);
    expect(stripeMocks.accountLinksCreate).toHaveBeenCalledTimes(1);
    expect(result.url).toBe("https://stripe.test/onboard");
  });

  it("does not create a duplicate account when one already exists", async () => {
    const supabase = mockSupabase({
      stripe_account_id: "acct_existing",
      stripe_onboarding_complete: false,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
      stripe_payouts_manual: false,
      stripe_payouts_schedule: null,
      stripe_details_submitted: true,
      stripe_requirements_due: ["external_account"],
      stripe_connect_updated_at: null,
    });

    await beginArtistConnectOnboarding({
      supabase,
      artistId: "artist-1",
      email: "artist@example.test",
      displayName: "Nova Ray",
      mode: "onboarding",
    });

    expect(stripeMocks.accountsCreate).not.toHaveBeenCalled();
    expect(stripeMocks.accountsRetrieve).toHaveBeenCalledWith("acct_existing");
    expect(stripeMocks.accountLinksCreate).toHaveBeenCalledTimes(1);
  });

  it("uses Stripe metadata before database lookup for account.updated mapping", async () => {
    const artistId = await resolveArtistIdForStripeAccount({} as SupabaseClient, {
      id: "acct_123",
      metadata: { livecircuit_artist_id: "artist-meta" },
    } as Stripe.Account);
    expect(artistId).toBe("artist-meta");
  });
});
