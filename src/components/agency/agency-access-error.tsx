"use client";

import { AlertTriangle } from "lucide-react";
import { RepairTestAgencyButton } from "@/components/admin/testing/repair-test-agency-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AGENCY_DASHBOARD_PATH } from "@/lib/agency/sections";
import type { AgencyOrgAccessDeniedCode } from "@/lib/data/agencies";
import { ROUTES } from "@/lib/constants";

const CODE_HINTS: Record<AgencyOrgAccessDeniedCode, string> = {
  not_configured:
    "Supabase is not configured in this environment, so agency data cannot be loaded.",
  no_membership:
    "This account is not linked to an agency team. The test agency may not have been fully generated.",
  organization_not_found:
    "The agency organization record is missing. Generate or repair the test agency before continuing.",
};

const FAILURE_LABELS: Record<string, string> = {
  not_agency_account: "Account is not an agency user",
  no_organization: "Agency record not generated",
  no_membership: "User is not linked to an agency",
  organization_not_found: "Agency not found",
  not_authenticated: "Not signed in",
};

type Props = {
  orgId: string;
  code: AgencyOrgAccessDeniedCode;
  message: string;
  impersonating?: boolean;
  failureCode?: string;
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
          <p>{CODE_HINTS[code]}</p>
          {impersonating ? (
            <p className="rounded-lg border border-amber-500/20 bg-amber-950/30 p-3 text-amber-100/90">
              This test agency has not been fully generated. Use Repair Test Account from Testing Center, or create a
              new agency with team seeding enabled.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" href={ROUTES.agencyHome}>
              Agency home
            </Button>
            {canRepair && userId ? <RepairTestAgencyButton userId={userId} /> : null}
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
            is resolved from the signed-in account, not from the URL.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
