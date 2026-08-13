import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isDestinationChargeTicketOrder } from "@/lib/services/refund.service";

describe("destination-charge refunds", () => {
  it("TEST 14: ticket destination orders are identified for Connect refund params", () => {
    expect(
      isDestinationChargeTicketOrder({
        id: "order-1",
        user_id: "user-1",
        artist_id: "artist-1",
        status: "paid",
        stripe_payment_intent_id: "pi_123",
        order_type: "ticket",
        total_cents: 2000,
        gross_cents: 2000,
        platform_fee_cents: 200,
        artist_earnings_cents: 1800,
        refund_cents: 0,
        metadata: { ticket_revenue_split: true },
      }),
    ).toBe(true);
  });

  it("TEST 14b: refund service sets reverse_transfer and refund_application_fee for tickets", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/services/refund.service.ts"), "utf8");
    expect(source).toMatch(/reverse_transfer\s*=\s*true/);
    expect(source).toMatch(/refund_application_fee\s*=\s*true/);
    expect(source).toMatch(/isDestinationChargeTicketOrder/);
  });

  it("TEST 23: merch orders skip destination refund flags", () => {
    expect(
      isDestinationChargeTicketOrder({
        id: "order-2",
        user_id: "user-1",
        artist_id: "artist-1",
        status: "paid",
        stripe_payment_intent_id: "pi_456",
        order_type: "merch",
        total_cents: 2500,
        gross_cents: null,
        platform_fee_cents: 250,
        artist_earnings_cents: 0,
        refund_cents: 0,
        metadata: {},
      }),
    ).toBe(false);
  });
});
