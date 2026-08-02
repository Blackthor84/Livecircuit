"use client";

import { AlertTriangle } from "lucide-react";
import { RepairTestAgencyButton } from "@/components/admin/testing/repair-test-agency-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AGENCY_DASHBOARD_PATH } from "@/lib/agency";
import type { AgencyOrgAccessDeniedCode, AgencySessionFailureCode } from "@/lib/agency";
import { ROUTES } from "@/lib/constants";

const CODE_HINTS: Record<AgencyOrgAccessDeniedCode, string> = {
  not_configured:
    "Supabase is not configured in this environment, so agency data cannot be loaded.",
  no_membership:
    "This account has no agency_organization_members row. Generate or repair the organization from Testing Center.",
  organization_not_found:
    "The agency organization record is missing. Use Repair Organization to recreate missing data.",
  permissions_missing:
    "Your agency role exists but permissions could not be loaded. Repair the organization to restore role permissions.",
  subscription_missing:
    "The agency organization has no subscription plan. Repair will attach a boutique/growth/enterprise partnership.",
};

const FAILURE_LABELS: Record<string, string> = {
  not_agency_account: "Account is not an agency user",
  no_organization: "Agency organization missing",
  no_membership: "Missing agency membership",
  organization_not_found: "Agency organization missing",
  permissions_missing: "Permissions missing",
  subscription_missing: "Subscription missing",
  not_authenticated: "Not signed in",
  not_configured: "Database not configured",
};

type Props = {
  orgId: string;
  code: AgencyOrgAccessDeniedCode;
  message: string;
  impersonating?: boolean;
  failureCode?: AgencySessionFailureCode | string;
  canRepair?: boolean;
  userId?: string;
};

export function AgencyAccessError({
  orgId,
  code,
  message,
  impersonating,
  failureCode,
  canRepair,
  userId,
}: Props) {
  const failureLabel = failureCode ? FAILURE_LABELS[failureCode] ?? failureCode : null;
  const hint = CODE_HINTS[code as keyof typeof CODE_HINTS] ?? CODE_HINTS.no_membership;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Card className="glass-panel border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-amber-100">
            <AlertTriangle className="size-5 text-amber-400" />
            Unable to open agency dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {failureLabel ? (
            <p className="text-sm font-medium uppercase tracking-wide text-amber-300">{failureLabel}</p>
          ) : null}
          <p className="text-base text-foreground">{message}</p>
          <p>{hint}</p>
          {impersonating ? (
            <p className="rounded-lg border border-amber-500/20 bg-amber-950/30 p-3 text-amber-100/90">
              This test organization is incomplete. Click <strong>Repair Organization</strong> below — it will
              automatically create membership, subscription, permissions, roster, bookings, and dashboard settings.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" href={ROUTES.agencyHome}>
              Agency home
            </Button>
            {canRepair && userId ? <RepairTestAgencyButton userId={userId} label="Repair Organization" /> : null}
            {impersonating ? (
              <Button size="sm" variant="secondary" href="/admin/testing">
                Back to Testing Center
              </Button>
            ) : (
              <Button size="sm" variant="secondary" href="/discover">
                Discover
              </Button>
            )}
          </div>
          <p className="text-xs">
            Agency portal routes are session-based at{" "}
            <code className="rounded bg-white/5 px-1 py-0.5">{AGENCY_DASHBOARD_PATH}</code> — your active organization
            is resolved from membership, not from the URL.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
