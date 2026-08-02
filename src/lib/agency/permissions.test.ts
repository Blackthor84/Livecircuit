import { describe, expect, it } from "vitest";
import { hasAgencyPermission, getAgencyPlanLimits } from "@/lib/agency/permissions";

describe("agency permissions", () => {
  it("grants finance users revenue export only", () => {
    expect(hasAgencyPermission("finance", "view_revenue")).toBe(true);
    expect(hasAgencyPermission("finance", "export_data")).toBe(true);
    expect(hasAgencyPermission("finance", "book_events")).toBe(false);
  });

  it("grants booking manager roster and booking access", () => {
    expect(hasAgencyPermission("booking_manager", "manage_roster")).toBe(true);
    expect(hasAgencyPermission("booking_manager", "book_events")).toBe(true);
    expect(hasAgencyPermission("booking_manager", "manage_team")).toBe(false);
  });

  it("returns boutique plan limits", () => {
    const limits = getAgencyPlanLimits("boutique");
    expect(limits.artistLimit).toBe(10);
    expect(limits.teamLimit).toBe(5);
  });

  it("normalizes legacy starter plan id", () => {
    const limits = getAgencyPlanLimits("starter");
    expect(limits.artistLimit).toBe(10);
    expect(limits.teamLimit).toBe(5);
  });
});
