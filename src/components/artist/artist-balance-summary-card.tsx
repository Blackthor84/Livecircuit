import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ArtistBalanceSummary } from "@/lib/services/artist-balance.service";
import { formatUsdFromCents } from "@/lib/monetization/artist-earnings-display";
import { ROUTES } from "@/lib/constants";

type Props = {
  balance: ArtistBalanceSummary;
  showLink?: boolean;
  compact?: boolean;
};

export function ArtistBalanceSummaryCard({ balance, showLink = true, compact = false }: Props) {
  return (
    <Card className="border-primary/15">
      <CardHeader className={compact ? "pb-3" : undefined}>
        <CardTitle className={compact ? "text-lg" : undefined}>Your earnings</CardTitle>
        <CardDescription>
          LiveCircuit tracks pending, available, and paid-out ticket earnings separately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{formatUsdFromCents(balance.availableCents)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{formatUsdFromCents(balance.pendingCents)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid out</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{formatUsdFromCents(balance.paidOutCents)}</p>
          </div>
        </div>
        {showLink ? (
          <Link href={ROUTES.artistEarnings} className="inline-flex text-sm font-medium text-primary hover:underline">
            See how payouts work →
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
