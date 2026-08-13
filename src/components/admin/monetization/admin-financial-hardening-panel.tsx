"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  recordArtistRecoveryAction,
  runFinancialReconciliationAction,
  syncArtistPayoutSchedulesAction,
  writeOffArtistReceivableAction,
} from "@/lib/actions/monetization-admin";
import type { ArtistReceivableRow } from "@/lib/services/artist-recovery.service";
import type { ReconciliationReport } from "@/lib/services/financial-reconciliation.service";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

type Props = {
  receivables: ArtistReceivableRow[];
};

export function AdminFinancialHardeningPanel({ receivables }: Props) {
  const [pending, startTransition] = useTransition();
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [recoveryAmounts, setRecoveryAmounts] = useState<Record<string, string>>({});

  function runReconciliation() {
    startTransition(async () => {
      const result = await runFinancialReconciliationAction();
      if (!result.ok || !("report" in result)) {
        toast.error("error" in result ? result.error : "Reconciliation failed");
        return;
      }
      setReconciliation(result.report);
      toast.success(`Scanned ${result.report.scannedOrders} orders — ${result.report.issues.length} issues`);
    });
  }

  function runConnectSync(dryRun: boolean) {
    startTransition(async () => {
      const result = await syncArtistPayoutSchedulesAction({ dryRun });
      if (!result.ok || !("result" in result)) {
        toast.error("error" in result ? result.error : "Connect sync failed");
        return;
      }
      setSyncSummary(
        `${result.result.dryRun ? "Dry run" : "Applied"}: ${result.result.updated} updated, ${result.result.skipped} skipped, ${result.result.failed} failed`,
      );
      toast.success(dryRun ? "Connect sync dry run complete" : "Connect payout schedules synced");
    });
  }

  function submitRecovery(receivableId: string) {
    const dollars = Number(recoveryAmounts[receivableId] ?? "0");
    if (!Number.isFinite(dollars) || dollars <= 0) {
      toast.error("Enter a valid recovery amount");
      return;
    }

    startTransition(async () => {
      const result = await recordArtistRecoveryAction({
        receivableId,
        amountCents: Math.round(dollars * 100),
        referenceId: `manual:${receivableId}:${Math.round(dollars * 100)}`,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Recovery recorded");
      window.location.reload();
    });
  }

  function submitWriteOff(receivableId: string) {
    startTransition(async () => {
      const result = await writeOffArtistReceivableAction({ receivableId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Receivable written off");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Financial reconciliation</CardTitle>
          <CardDescription>Detect split mismatches, missing Stripe fees, and duplicate payouts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button disabled={pending} onClick={runReconciliation}>
            Run reconciliation report
          </Button>
          {reconciliation ? (
            <div className="space-y-2 text-sm">
              <p>
                Orders: {reconciliation.scannedOrders} · Payouts: {reconciliation.scannedPayouts} · Issues:{" "}
                {reconciliation.issues.length}
              </p>
              <p className="text-muted-foreground">
                Gross {formatUsd(reconciliation.summary.grossTicketCents)} · Platform{" "}
                {formatUsd(reconciliation.summary.platformFeeCents)} · Artist{" "}
                {formatUsd(reconciliation.summary.artistEarningsCents)} · Stripe fees{" "}
                {formatUsd(reconciliation.summary.stripeFeeCents)}
              </p>
              {reconciliation.issues.length > 0 ? (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded border p-3 text-xs">
                  {reconciliation.issues.map((issue, index) => (
                    <li key={`${issue.code}-${index}`}>
                      [{issue.severity}] {issue.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No discrepancies detected in scanned records.</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Connect payout schedule sync</CardTitle>
          <CardDescription>
            Convert existing Express accounts to manual payouts. Dry run is default — apply only when ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button disabled={pending} variant="outline" onClick={() => runConnectSync(true)}>
            Dry run sync
          </Button>
          <Button disabled={pending} variant="destructive" onClick={() => runConnectSync(false)}>
            Apply manual payouts
          </Button>
          {syncSummary ? <p className="w-full text-sm text-muted-foreground">{syncSummary}</p> : null}
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Post-payout refund recovery</CardTitle>
          <CardDescription>
            Record manual recoveries when an artist owes LiveCircuit after a post-payout refund.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receivables.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open receivables.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Artist</th>
                    <th className="py-2 pr-4">Order</th>
                    <th className="py-2 pr-4">Owed</th>
                    <th className="py-2 pr-4">Recovered</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4">Manual recovery</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((row) => {
                    const artist = row.artists as { stage_name: string } | null;
                    const remaining = row.amount_cents - row.recovered_cents;
                    return (
                      <tr key={row.id} className="border-b border-border/60">
                        <td className="py-3 pr-4">{artist?.stage_name ?? row.artist_id}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{row.order_id.slice(0, 8)}…</td>
                        <td className="py-3 pr-4 tabular-nums">{formatUsd(row.amount_cents)}</td>
                        <td className="py-3 pr-4 tabular-nums">{formatUsd(row.recovered_cents)}</td>
                        <td className="py-3 pr-4 uppercase text-xs">{row.status.replace(/_/g, " ")}</td>
                        <td className="py-3 pr-4">{new Date(row.created_at).toLocaleDateString()}</td>
                        <td className="py-3 pr-4">
                          {remaining > 0 && row.status !== "written_off" ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                className="h-8 w-24"
                                placeholder="USD"
                                value={recoveryAmounts[row.id] ?? ""}
                                onChange={(event) =>
                                  setRecoveryAmounts((prev) => ({ ...prev, [row.id]: event.target.value }))
                                }
                              />
                              <Button disabled={pending} size="sm" onClick={() => submitRecovery(row.id)}>
                                Record
                              </Button>
                              <Button disabled={pending} size="sm" variant="outline" onClick={() => submitWriteOff(row.id)}>
                                Write off
                              </Button>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
