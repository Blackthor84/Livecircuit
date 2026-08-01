/**
 * Server-only Agency public API.
 * Route Handlers, Server Components, and Server Actions should import from here.
 */
import "server-only";

export type {
  AgencyInvitationStatus,
  AgencyMembershipRecord,
  AgencyMembershipResolution,
  AgencyMembershipStatus,
  AgencySession,
  AgencySessionFailureCode,
  AgencySessionResult,
  OrganizationHealthCheck,
} from "./membership.types";

export type { AgencyDashboardConfiguration } from "./types";

export {
  ensureAgencyMembership,
  ensureAgencySubscription,
  getAdminClientForMembershipRepair,
  listAgencyMembershipsForUser,
  listAgencyMembershipsForUserAdmin,
  resolveAgencyMembershipForUser,
  touchAgencyMembershipActivity,
  verifyAgencyMembershipAdmin,
} from "./membership.server";

export {
  getAgencySessionOrgId,
  loadAgencySessionForUser,
  requireAgencySessionUserId,
  resolveAgencySession,
  userHasAgencyMembership,
} from "./session.server";

export {
  buildDefaultAgencyDashboardConfiguration,
  ensureAgencyDashboardSettings,
  ensureAgencyOrganizationComplete,
  validateAgencyOrganizationHealth,
} from "./organization-health.server";

export { computeBulkBookingSteps, processBulkBookingJob } from "./bulk-jobs";
export type { AgencyJobStatus, AgencyJobType, BulkBookingPayload } from "./bulk-jobs";
