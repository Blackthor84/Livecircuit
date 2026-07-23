import { describe, expect, it } from "vitest";
import { checkoutBodySchema } from "@/lib/validations/checkout";

describe("checkoutBodySchema", () => {
  it("accepts ticket checkout with tour stop", () => {
    const parsed = checkoutBodySchema.safeParse({
      type: "ticket",
      tourStopId: "11111111-1111-4111-8111-111111111111",
      tier: "vip",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tier).toBe("vip");
    }
  });

  it("rejects invalid tip amounts", () => {
    const parsed = checkoutBodySchema.safeParse({
      type: "tip",
      tipAmountCents: 50,
    });
    expect(parsed.success).toBe(false);
  });
});
