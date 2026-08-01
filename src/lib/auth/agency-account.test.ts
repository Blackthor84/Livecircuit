import { describe, expect, it } from "vitest";
import { resolveAgencyRedirect } from "@/lib/auth/agency-account";
import { agencyDashboardPath } from "@/lib/agency/sections";
import { formatRoleBadge, formatAccountTypeLabel } from "@/lib/features/account-menu";

describe("agency account type", () => {
  it("resolves agency dashboard from profile role", () => {
    expect(resolveAgencyRedirect({ role: "agency", primary_agency_id: "org-123" })).toBe("/agency/dashboard");
  });

  it("returns null for non-agency roles", () => {
    expect(resolveAgencyRedirect({ role: "fan", primary_agency_id: "org-123" })).toBeNull();
  });

  it("uses session-based dashboard path", () => {
    expect(agencyDashboardPath()).toBe("/agency/dashboard");
  });

  it("formats agency member role badge", () => {
    expect(formatRoleBadge("agency", "booking_manager")).toBe("BOOKING MANAGER");
    expect(formatAccountTypeLabel("agency")).toBe("AGENCY");
  });
});
