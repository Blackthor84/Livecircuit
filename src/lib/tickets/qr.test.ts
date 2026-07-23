import { describe, expect, it } from "vitest";
import { generateTicketQrPayload } from "@/lib/tickets/qr";

describe("generateTicketQrPayload", () => {
  it("includes ticket id and opaque suffix", () => {
    const code = generateTicketQrPayload("11111111-1111-4111-8111-111111111111");
    expect(code.startsWith("lc:11111111-1111-4111-8111-111111111111:")).toBe(true);
    expect(code.length).toBeGreaterThan(40);
  });

  it("generates unique codes", () => {
    const a = generateTicketQrPayload("same-id");
    const b = generateTicketQrPayload("same-id");
    expect(a).not.toBe(b);
  });
});
