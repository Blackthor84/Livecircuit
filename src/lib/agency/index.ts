/**
 * Client-safe Agency public API.
 * Import types, permissions, routing helpers, and templates from here in Client Components.
 * For server-only operations use `@/lib/agency/server`.
 */

export type * from "./types";
export type * from "./membership.types";

export {
  AGENCY_MEMBER_ROLE_LABELS,
  AGENCY_PLANS,
  AGENCY_PARTNERSHIP_PLANS,
  getAgencyPermissions,
  getAgencyPlanLimits,
  hasAgencyPermission,
  normalizeAgencyPlan,
  agencyPlanLabel,
} from "./permissions";

export {
  AGENCY_WHOLESALE_BENEFITS,
  AGENCY_EXCLUSIVE_FEATURES,
  AGENCY_PREMIUM_PERKS,
  AGENCY_PARTNERSHIP_PHILOSOPHY,
  getAgencyPartnershipPlan,
  computeAgencyMonthlySavingsExample,
  agencyPlanHasCapability,
} from "./partnership-program";

export {
  AGENCY_DASHBOARD_PATH,
  AGENCY_SECTIONS,
  agencyDashboardPath,
  agencyPath,
  agencyPortalPath,
  agencySectionFromPathname,
  agencySectionLabel,
  revalidateAgencyPortalPaths,
} from "./sections";
export type { AgencySectionHref } from "./sections";

export {
  AGENCY_ORG_TEMPLATES,
  AGENCY_SCENARIOS,
  AGENCY_TEAM_ROLES,
  expandAgencyTeamTemplate,
  getAgencyOrgTemplate,
} from "./org-templates";
export type { AgencyOrgTemplate, AgencyScenarioSlug, AgencyTeamSlot } from "./org-templates";

export {
  detectCalendarConflicts,
  eventPositionInDay,
  eventsOverlap,
  formatCalendarRange,
  getMonthDays,
  getWeekDays,
  overlapMinutes,
  rescheduleEventToDayHour,
} from "./calendar";
export type { AgencyCalendarEvent, CalendarConflict, CalendarView } from "./calendar";

export {
  agencyRevenueToCsv,
  agencyRevenueToExcel,
  agencyRevenueToPdfHtml,
  downloadClientFile,
  openPdfPrintWindow,
} from "./revenue-export";
export type { AgencyRevenueLine, AgencyRevenueReport } from "./revenue-export";
