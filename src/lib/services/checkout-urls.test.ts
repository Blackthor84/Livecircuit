import { describe, expect, it } from "vitest";
import { buildCheckoutCancelUrl } from "@/lib/services/checkout-urls";

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
