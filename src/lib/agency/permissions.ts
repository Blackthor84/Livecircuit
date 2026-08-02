import type { AgencyMemberRole, AgencyPermissions } from "@/lib/agency/types";
import {
  AGENCY_PLANS,
  AGENCY_PARTNERSHIP_PLANS,
  getAgencyPlanLimits as getPartnershipPlanLimits,
  normalizeAgencyPlan,
} from "@/lib/agency/partnership-program";

export {
  AGENCY_PLANS,
  AGENCY_PARTNERSHIP_PLANS,
  normalizeAgencyPlan,
  agencyPlanLabel,
  getAgencyPartnershipPlan,
  getAgencyPromotionalCredits,
  agencyIncludesVenueTier,
  computeAgencyMonthlySavingsExample,
  agencyPlanHasCapability,
  AGENCY_WHOLESALE_BENEFITS,
  AGENCY_EXCLUSIVE_FEATURES,
  AGENCY_PREMIUM_PERKS,
  MARKETING_CREDIT_USES,
  AGENCY_COMPARISON_ROWS,
  AGENCY_PARTNERSHIP_PHILOSOPHY,
} from "@/lib/agency/partnership-program";

export function getAgencyPlanLimits(plan: string | null | undefined) {
  return getPartnershipPlanLimits(plan);
}

const ROLE_DEFAULTS: Record<AgencyMemberRole, AgencyPermissions> = {
  owner: {
    manage_roster: true,
    book_events: true,
    view_revenue: true,
    manage_team: true,
    manage_sponsorship: true,
    export_data: true,
  },
  admin: {
    manage_roster: true,
    book_events: true,
    view_revenue: true,
    manage_team: true,
    manage_sponsorship: true,
    export_data: true,
  },
  booking_manager: {
    manage_roster: true,
    book_events: true,
    view_revenue: true,
    manage_team: false,
    manage_sponsorship: false,
    export_data: true,
  },
  artist_manager: {
    manage_roster: true,
    book_events: true,
    view_revenue: false,
    manage_team: false,
    manage_sponsorship: false,
    export_data: false,
  },
  assistant: {
    manage_roster: false,
    book_events: false,
    view_revenue: false,
    manage_team: false,
    manage_sponsorship: false,
    export_data: false,
  },
  marketing: {
    manage_roster: false,
    book_events: false,
    view_revenue: false,
    manage_team: false,
    manage_sponsorship: true,
    export_data: false,
  },
  finance: {
    manage_roster: false,
    book_events: false,
    view_revenue: true,
    manage_team: false,
    manage_sponsorship: false,
    export_data: true,
  },
  read_only: {},
};

export function getAgencyPermissions(role: AgencyMemberRole): AgencyPermissions {
  return ROLE_DEFAULTS[role] ?? {};
}

export function hasAgencyPermission(
  role: AgencyMemberRole,
  permission: keyof AgencyPermissions
): boolean {
  return Boolean(getAgencyPermissions(role)[permission]);
}

export const AGENCY_MEMBER_ROLE_LABELS: Record<AgencyMemberRole, string> = {
  owner: "Agency Owner",
  admin: "Agency Admin",
  booking_manager: "Booking Manager",
  artist_manager: "Artist Manager",
  assistant: "Assistant",
  marketing: "Marketing",
  finance: "Finance",
  read_only: "Read-only",
};
