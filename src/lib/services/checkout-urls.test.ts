import { describe, expect, it, vi } from "vitest";
import { buildCheckoutCancelUrl, buildCheckoutSuccessUrl } from "@/lib/services/checkout-urls";

describe("buildCheckoutCancelUrl", () => {
  it("preserves checkout context on cancel", () => {
    const url = buildCheckoutCancelUrl("http://localhost:3000", {
      type: "ticket",
      eventId: "evt-1",
      tier: "general",
    });
    expect(url).toBe("http://localhost:3000/checkout?canceled=1&type=ticket&event=evt-1");
  });
});

describe("buildCheckoutSuccessUrl", () => {
  it("uses dashboard for sandbox/test artists instead of public event pages", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "artists") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: { profiles: { is_test_account: true } },
                  }),
                ),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const url = await buildCheckoutSuccessUrl(
      supabase as never,
      "https://www.watchlivecircuit.com",
      { type: "ticket", tourStopId: "stop-1", tier: "general" },
      { eventId: "evt-1", artistId: "artist-1" } as never,
    );

    expect(url).toBe("https://www.watchlivecircuit.com/dashboard?checkout=success");
  });

  it("uses public event page for non-test artists", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "artists") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: { profiles: { is_test_account: false } },
                  }),
                ),
              })),
            })),
          };
        }
        if (table === "events") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: { slug: "summer-show", artists: { slug: "real-artist" } },
                  }),
                ),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const url = await buildCheckoutSuccessUrl(
      supabase as never,
      "https://www.watchlivecircuit.com",
      { type: "ticket", tourStopId: "stop-1", tier: "general" },
      { eventId: "evt-1", artistId: "artist-1" } as never,
    );

    expect(url).toBe(
      "https://www.watchlivecircuit.com/artists/real-artist/events/summer-show?checkout=success",
    );
  });
});
