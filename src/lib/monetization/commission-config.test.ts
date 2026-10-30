import { describe, expect, it } from "vitest";
import {
  emptyCommissionConfig,
  mapCommissionRow,
  ticketPlatformFeePercentFromCommission,
} from "@/lib/monetization/commission-config.server";

describe("commission-config", () => {
  it("maps database row defaults", () => {
    expect(mapCommissionRow(null).ticketCommissionPercent).toBe(10);
    expect(mapCommissionRow(null).privateBookingCommissionPercent).toBe(10);
  });

  it("prefers commission table for live ticket percent", () => {
    const commission = emptyCommissionConfig();
    commission.ticketCommissionPercent = 12;
    expect(ticketPlatformFeePercentFromCommission(commission, 10)).toBe(12);
  });
});
