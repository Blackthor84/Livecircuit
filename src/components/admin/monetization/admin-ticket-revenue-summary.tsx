import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminTicketRevenueSummary } from "@/lib/services/artist-balance.service";
import { createClient } from "@/lib/supabase/server";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export async function AdminTicketRevenueSummaryCard() {
  const supabase = await createClient();
  const summary = await getAdminTicketRevenueSummary(supabase);

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>Ticket revenue accounting</CardTitle>
        <CardDescription>
          Locked 90/10 ticket economics — pending balances are released after the configured hold period.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-sm text-muted-foreground">Gross ticket revenue</p>
          <p className="text-2xl font-semibold tabular-nums">{formatUsd(summary.grossTicketCents)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">LiveCircuit platform revenue</p>
          <p className="text-2xl font-semibold tabular-nums">{formatUsd(summary.platformFeeCents)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Artist earnings recorded</p>
          <p className="text-2xl font-semibold tabular-nums">{formatUsd(summary.artistEarningsCents)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Pending artist balances</p>
          <p className="text-2xl font-semibold tabular-nums">{formatUsd(summary.pendingArtistCents)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
