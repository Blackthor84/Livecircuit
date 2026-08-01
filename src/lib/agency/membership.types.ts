import type { AgencyMemberRole } from "@/lib/agency/types";
import type { getAgencyPermissions } from "@/lib/agency/permissions";

export type AgencyMembershipStatus = "active" | "invited" | "suspended" | "removed";
export type AgencyInvitationStatus = "pending" | "accepted" | "declined" | "expired";

/** Canonical join table: agency_organization_members */
export type AgencyMembershipRecord = {
  id: string;
  organization_id: string;
  user_id: string;
  role: AgencyMemberRole;
  status?: AgencyMembershipStatus;
  invitation_status?: AgencyInvitationStatus;
  accepted_at: string | null;
  last_active_at?: string | null;
};

export type AgencyMembershipResolution =
  | {
      ok: true;
      membership: AgencyMembershipRecord;
      organization: Record<string, unknown>;
      permissions: ReturnType<typeof getAgencyPermissions>;
    }
  | {
      ok: false;
      code:
        | "not_configured"
        | "no_membership"
        | "organization_not_found"
        | "membership_query_failed"
        | "organization_query_failed";
      message: string;
      details?: Record<string, unknown>;
    };

export type OrganizationHealthCheck = {
  key: string;
  ok: boolean;
  issue?: string;
  table?: string;
};

export type AgencySessionFailureCode =
  | "not_authenticated"
  | "not_agency_account"
  | "no_membership"
  | "organization_not_found"
  | "permissions_missing"
  | "subscription_missing"
  | "not_configured";

export type AgencySession = {
  userId: string;
  orgId: string;
  membershipId: string;
  memberRole: AgencyMemberRole;
  organization: Record<string, unknown>;
  permissions: ReturnType<typeof getAgencyPermissions>;
  subscription: {
    plan: string;
    planStartedAt: string | null;
    planRenewsAt: string | null;
    stripeSubscriptionId: string | null;
  };
};

export type AgencySessionResult =
  | { ok: true; session: AgencySession }
  | { ok: false; code: AgencySessionFailureCode; message: string; details?: Record<string, unknown> };
