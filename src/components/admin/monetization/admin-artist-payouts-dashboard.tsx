import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminPayoutDashboard } from "@/lib/services/artist-payout.service";
import { createClient } from "@/lib/supabase/server";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export async function AdminArtistPayoutsDashboard() {
  const supabase = await createClient();
  const { payouts, totals } = await getAdminPayoutDashboard(supabase);

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Artist payout pipeline</CardTitle>
          <CardDescription>
            Internal balances and Stripe connected-account bank payouts (manual schedule).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-xl font-semibold tabular-nums">{formatUsd(totals.pending)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-xl font-semibold tabular-nums">{formatUsd(totals.available)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Processing</p>
            <p className="text-xl font-semibold tabular-nums">{formatUsd(totals.processing)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-xl font-semibold tabular-nums">{formatUsd(totals.paid)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className="text-xl font-semibold tabular-nums">{formatUsd(totals.failed)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Held orders</p>
            <p className="text-xl font-semibold tabular-nums">{totals.held}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Recovery due</p>
            <p className="text-xl font-semibold tabular-nums text-amber-600">{formatUsd(totals.receivable)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Payout records</CardTitle>
          <CardDescription>Stripe bank payouts initiated by the daily release job.</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No artist payouts recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Artist</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4">Completed</th>
                    <th className="py-2 pr-4">Stripe payout</th>
                    <th className="py-2 pr-4">Failure</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((row) => {
                    const artist = row.artists as { stage_name: string; slug: string } | { stage_name: string; slug: string }[] | null;
                    const name = Array.isArray(artist) ? artist[0]?.stage_name : artist?.stage_name;
                    return (
                      <tr key={row.id as string} className="border-b border-border/60">
                        <td className="py-3 pr-4">{name ?? row.artist_id}</td>
                        <td className="py-3 pr-4 tabular-nums">{formatUsd(Number(row.amount_cents ?? 0))}</td>
                        <td className="py-3 pr-4 uppercase text-xs">{String(row.status)}</td>
                        <td className="py-3 pr-4">{formatDate(row.created_at as string)}</td>
                        <td className="py-3 pr-4">{formatDate(row.completed_at as string | null)}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{row.stripe_payout_id ?? "—"}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{row.failure_reason ?? "—"}</td>
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
