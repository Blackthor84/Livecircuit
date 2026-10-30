import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUsdFromCents } from "@/lib/monetization/artist-earnings-display";
import type { ArtistFastPayDashboard } from "@/lib/services/artist-fastpay-dashboard.service";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";

function formatWhen(iso: string | null): string {
  if (!iso) return "After performance completes";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function payoutStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    available: "Available for payout",
    processing: "Payout processing",
    paid: "Paid",
    held: "Held",
    partially_refunded: "Partially refunded",
    refunded: "Refunded",
    failed: "Failed",
  };
  return map[status] ?? status;
}

export function ArtistFastPayPanel({ data }: { data: ArtistFastPayDashboard }) {
  const { balance, pendingOrders, payoutHistory, fastPayEnabled } = data;

  return (
    <Card className="border-primary/15">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>FastPay & payouts</CardTitle>
          {fastPayEnabled ? (
            <Badge variant="secondary">FastPay active for new ticket sales</Badge>
          ) : (
            <Badge variant="outline">Standard payout schedule</Badge>
          )}
        </div>
        <CardDescription>
          Track pending ticket earnings, performance completion, and payout processing. Bank posting times vary by
          Stripe and your financial institution—we do not show guaranteed bank-arrival dates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{formatUsdFromCents(balance.pendingCents)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{formatUsdFromCents(balance.availableCents)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid out</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{formatUsdFromCents(balance.paidOutCents)}</p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Ticket earnings by performance</h3>
          {pendingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent paid ticket orders with artist earnings.</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
              {pendingOrders.map((row) => (
                <li key={row.orderId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{row.eventTitle ?? "Ticket order"}</p>
                    <p className="text-xs text-muted-foreground">
                      Performance:{" "}
                      {row.performanceCompleted
                        ? "Completed"
                        : row.eventStatus === "cancelled"
                          ? "Cancelled"
                          : row.eventStatus === "live"
                            ? "Live"
                            : "Not completed yet"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expected eligibility: {formatWhen(row.expectedEligibilityAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatUsdFromCents(row.pendingCents)}</p>
                    <p className="text-xs text-muted-foreground">{payoutStatusLabel(row.payoutStatus)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Recent payout activity</h3>
          {payoutHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts initiated yet.</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
              {payoutHistory.map((p) => (
                <li key={p.id as string} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="capitalize text-muted-foreground">{String(p.status)}</span>
                  <span className="font-semibold tabular-nums">{formatUsdFromCents(Number(p.amount_cents ?? 0))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link href={ROUTES.artistEarnings} className="inline-flex text-sm font-medium text-primary hover:underline">
          Full earnings & payout guide →
        </Link>
      </CardContent>
    </Card>
  );
}
