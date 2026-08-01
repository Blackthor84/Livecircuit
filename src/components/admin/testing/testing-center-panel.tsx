"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Play, RefreshCw, Trash2, UserPlus, Users, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bulkGenerateTestAgenciesAction,
  bulkGenerateTestUsersAction,
  createTestAgencyAction,
  createTestUserAction,
  deleteAllTestDataAction,
  deleteTestAgencyOrganizationAction,
  deleteTestUserAction,
  repairTestAgencyAccountAction,
  resetTestUserAction,
  runSimulatorAction,
  type TestingActionResult,
} from "@/lib/actions/testing";
import {
  ARTIST_SCENARIOS,
  BULK_COUNTS,
  FAN_SCENARIOS,
  SIMULATOR_ACTIONS,
} from "@/lib/testing/constants";
import { AGENCY_SCENARIOS } from "@/lib/agency";
import { AGENCY_GENERATION_MODES, type AgencyGenerationMode } from "@/lib/testing";
import { formatTestAccountRoleLabel, type TestAccountRow } from "@/lib/testing";

type Props = {
  accounts: TestAccountRow[];
  totalCount: number;
  canManage: boolean;
  canImpersonate: boolean;
};

export function TestingCenterPanel({ accounts, totalCount, canManage, canImpersonate }: Props) {
  const router = useRouter();
  const [fanScenario, setFanScenario] = useState<string>(FAN_SCENARIOS[0]!.slug);
  const [artistScenario, setArtistScenario] = useState<string>(ARTIST_SCENARIOS[0]!.slug);
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkMix, setBulkMix] = useState<"fans" | "artists" | "mixed">("mixed");
  const [agencyScenario, setAgencyScenario] = useState<string>(AGENCY_SCENARIOS[0]!.slug);
  const [agencyGenerationMode, setAgencyGenerationMode] = useState<AgencyGenerationMode>("repair");
  const [agencyBulkCount, setAgencyBulkCount] = useState(1);
  const [seedTeamMembers, setSeedTeamMembers] = useState(true);
  const [simAction, setSimAction] = useState(SIMULATOR_ACTIONS[0]!.id);
  const [simCount, setSimCount] = useState(500);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastError, setLastError] = useState<Extract<TestingActionResult, { ok: false }> | null>(null);

  async function impersonate(userId: string) {
    setBusy(`imp-${userId}`);
    try {
      const res = await fetch("/api/admin/testing/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; redirect?: string };
      if (!data.ok) toast.error(data.error ?? "Impersonation failed");
      else {
        toast.success("Now impersonating test user");
        window.location.assign(data.redirect ?? "/");
      }
    } finally {
      setBusy(null);
    }
  }

  async function runAction(key: string, fn: () => Promise<TestingActionResult>) {
    setBusy(key);
    try {
      const result = await fn();
      if (!result.ok) {
        setLastError(result);
        const headline = result.message ?? result.databaseError ?? result.error;
        toast.error(result.failedStep ? `${result.failedStep}: ${headline}` : headline);
      } else {
        setLastError(null);
        toast.success(result.message ?? "Done");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-200">
          <FlaskConical className="size-3.5" />
          Developer Testing
        </Badge>
        <span className="text-sm text-muted-foreground">{totalCount} active test accounts</span>
      </div>

      {canManage ? (
        <>
          {lastError ? (
            <Card className="glass-panel border-destructive/40 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Test account creation failed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {lastError.failedStep ? (
                  <p>
                    <span className="font-medium text-destructive">Failed step:</span> {lastError.failedStep}
                  </p>
                ) : null}
                {lastError.message ?? lastError.databaseError ? (
                  <p>
                    <span className="font-medium text-destructive">Message:</span>{" "}
                    {lastError.message ?? lastError.databaseError}
                  </p>
                ) : (
                  <p>
                    <span className="font-medium text-destructive">Error:</span> {lastError.error}
                  </p>
                )}
                {lastError.code ? (
                  <p>
                    <span className="font-medium text-destructive">Code:</span> {lastError.code}
                  </p>
                ) : null}
                {lastError.details ? (
                  <p>
                    <span className="font-medium text-destructive">Details:</span> {lastError.details}
                  </p>
                ) : null}
                {lastError.hint ? (
                  <p>
                    <span className="font-medium text-destructive">Hint:</span> {lastError.hint}
                  </p>
                ) : null}
                {lastError.steps?.length ? (
                  <div>
                    <p className="mb-2 font-medium">Steps completed before failure:</p>
                    <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                      {lastError.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {lastError.stack ? (
                  <details className="rounded-md border border-destructive/20 bg-black/20 p-3">
                    <summary className="cursor-pointer font-medium">Stack trace</summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                      {lastError.stack}
                    </pre>
                  </details>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="size-4" />
                  Create test user
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Fan scenario</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={fanScenario}
                    onChange={(e) => setFanScenario(e.target.value)}
                  >
                    {FAN_SCENARIOS.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void runAction("fan", () => createTestUserAction({ type: "fan", scenario: fanScenario }))
                    }
                  >
                    Create fan
                  </Button>
                </div>
                <div className="space-y-2 border-t border-white/10 pt-4">
                  <Label>Artist scenario</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={artistScenario}
                    onChange={(e) => setArtistScenario(e.target.value)}
                  >
                    {ARTIST_SCENARIOS.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void runAction("artist", () =>
                        createTestUserAction({ type: "artist", scenario: artistScenario })
                      )
                    }
                  >
                    Create artist
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4" />
                  Bulk generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {BULK_COUNTS.map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant={bulkCount === n ? "default" : "secondary"}
                      onClick={() => setBulkCount(n)}
                    >
                      {n.toLocaleString()}
                    </Button>
                  ))}
                </div>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={bulkMix}
                  onChange={(e) => setBulkMix(e.target.value as typeof bulkMix)}
                >
                  <option value="mixed">Mixed platform</option>
                  <option value="fans">Fans only</option>
                  <option value="artists">Artists only</option>
                </select>
                <Button
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void runAction("bulk", () =>
                      bulkGenerateTestUsersAction({
                        count: bulkCount,
                        mix: bulkMix,
                        confirmProduction: bulkCount >= 100,
                      })
                    )
                  }
                >
                  Generate {bulkCount.toLocaleString()} users
                </Button>
                <p className="text-xs text-muted-foreground">
                  Production environments require explicit confirmation for 100+ users.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="size-4" />
                  Test agencies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Agency scenario</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={agencyScenario}
                    onChange={(e) => setAgencyScenario(e.target.value)}
                  >
                    {AGENCY_SCENARIOS.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.label} ({s.artistCount} artists, {s.bookingCount} bookings)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Generation mode</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={agencyGenerationMode}
                    onChange={(e) => setAgencyGenerationMode(e.target.value as AgencyGenerationMode)}
                  >
                    {AGENCY_GENERATION_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {AGENCY_GENERATION_MODES.find((mode) => mode.value === agencyGenerationMode)?.description}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={seedTeamMembers}
                    onChange={(e) => setSeedTeamMembers(e.target.checked)}
                  />
                  Seed full organization template (team, roster, bookings, revenue)
                </label>
                <Button
                  size="sm"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void runAction("agency", () =>
                      createTestAgencyAction({
                        scenario: agencyScenario,
                        seedTeamMembers,
                        generationMode: agencyGenerationMode,
                      })
                    )
                  }
                >
                  Create test agency
                </Button>
                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                  {[1, 3, 5, 10].map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant={agencyBulkCount === n ? "default" : "secondary"}
                      onClick={() => setAgencyBulkCount(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="secondary"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void runAction("agency-bulk", () =>
                      bulkGenerateTestAgenciesAction({
                        count: agencyBulkCount,
                        scenario: agencyScenario,
                        seedTeamMembers,
                        generationMode: agencyGenerationMode,
                      })
                    )
                  }
                >
                  Generate {agencyBulkCount} agencies
                </Button>
                <p className="text-xs text-muted-foreground">
                  All agency data is marked is_test and excluded from production analytics.
                </p>
              </CardContent>
            </Card>
          </section>

          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Play className="size-4" />
                Platform simulator
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label>Activity type</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={simAction}
                  onChange={(e) => setSimAction(e.target.value as typeof simAction)}
                >
                  {SIMULATOR_ACTIONS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Count</Label>
                <Input
                  type="number"
                  min={1}
                  value={simCount}
                  onChange={(e) => setSimCount(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <Button
                disabled={Boolean(busy)}
                onClick={() =>
                  void runAction("sim", () => runSimulatorAction({ action: simAction, count: simCount }))
                }
              >
                Run simulator
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="destructive"
              disabled={Boolean(busy)}
              onClick={() => {
                if (!window.confirm("Delete ALL test accounts? This cannot be undone.")) return;
                void runAction("delete-all", deleteAllTestDataAction);
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete all test data
            </Button>
          </div>
        </>
      ) : null}

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Active test users</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No test accounts yet.</p>
          ) : (
            <ul className="space-y-3">
              {accounts.map((account) => (
                <li
                  key={account.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{account.display_name ?? account.username}</p>
                    <p className="text-sm text-muted-foreground">
                      @{account.username} · {formatTestAccountRoleLabel(account)} ·{" "}
                      {account.test_scenario?.replace(/_/g, " ") ?? "custom"}
                    </p>
                    {account.role === "agency" && account.agency ? (
                      <p className="text-xs text-sky-300">
                        {account.agency.name} · {account.agency.plan} plan
                      </p>
                    ) : null}
                    {account.artist ? (
                      <p className="text-xs text-primary">{account.artist.stage_name}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canImpersonate ? (
                      <Button
                        size="sm"
                        disabled={Boolean(busy)}
                        onClick={() => void impersonate(account.id)}
                      >
                        Impersonate
                      </Button>
                    ) : null}
                    {canManage && account.role === "agency" && account.agency_member_role === "owner" && account.primary_agency_id ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={Boolean(busy)}
                        onClick={() => {
                          if (
                            !window.confirm(
                              "Delete this entire test organization and all seeded agency data?"
                            )
                          ) {
                            return;
                          }
                          const deleteAuthUsers = window.confirm(
                            "Also delete Auth users created for this test organization?"
                          );
                          void runAction(`delete-org-${account.primary_agency_id}`, () =>
                            deleteTestAgencyOrganizationAction({
                              orgId: account.primary_agency_id!,
                              deleteAuthUsers,
                            })
                          );
                        }}
                      >
                        Delete organization
                      </Button>
                    ) : null}
                    {canManage && account.role === "agency" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void runAction(`repair-${account.id}`, () => repairTestAgencyAccountAction(account.id))
                        }
                      >
                        Repair agency
                      </Button>
                    ) : null}
                    {canManage ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={Boolean(busy)}
                          onClick={() => void runAction(`reset-${account.id}`, () => resetTestUserAction(account.id))}
                        >
                          <RefreshCw className="size-3.5" />
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(busy)}
                          onClick={() => {
                            if (!window.confirm("Delete this test user?")) return;
                            void runAction(`del-${account.id}`, () => deleteTestUserAction(account.id));
                          }}
                        >
                          Delete
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
