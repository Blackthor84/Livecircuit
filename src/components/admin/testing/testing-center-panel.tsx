"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Play, RefreshCw, Trash2, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bulkGenerateTestUsersAction,
  createTestUserAction,
  deleteAllTestDataAction,
  deleteTestUserAction,
  resetTestUserAction,
  runSimulatorAction,
} from "@/lib/actions/testing";
import {
  ARTIST_SCENARIOS,
  BULK_COUNTS,
  FAN_SCENARIOS,
  SIMULATOR_ACTIONS,
} from "@/lib/testing/constants";
import type { TestAccountRow } from "@/lib/testing/list";
import { formatRoleBadge } from "@/lib/features/account-menu";

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
  const [simAction, setSimAction] = useState(SIMULATOR_ACTIONS[0]!.id);
  const [simCount, setSimCount] = useState(500);
  const [busy, setBusy] = useState<string | null>(null);

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
        router.push(data.redirect ?? "/");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function runAction(key: string, fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setBusy(key);
    try {
      const result = await fn();
      if (!result.ok) toast.error(result.error);
      else {
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
                      @{account.username} · {formatRoleBadge(account.role as never)} ·{" "}
                      {account.test_scenario?.replace(/_/g, " ") ?? "custom"}
                    </p>
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
