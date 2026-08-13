"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ArtistConnectStatus } from "@/lib/stripe/connect-status";
import { artistConnectStatusLabel } from "@/lib/stripe/connect-status";
import type { ArtistBalanceSummary, ArtistTicketTransaction } from "@/lib/services/artist-balance.service";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

type PayoutRow = {
  id: string;
  amount_cents: number;
  status: string;
  initiated_at: string | null;
  completed_at: string | null;
  stripe_payout_id: string | null;
  failure_reason: string | null;
  created_at: string;
};

type Props = {
  initialStatus: ArtistConnectStatus;
  stripeConfigured: boolean;
  balance: ArtistBalanceSummary;
  transactions: ArtistTicketTransaction[];
  payouts: PayoutRow[];
};

export function ArtistPaymentsPanel({
  initialStatus,
  stripeConfigured,
  balance,
  transactions,
  payouts,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  async function startFlow(mode: "onboarding" | "manage") {
    if (!stripeConfigured) {
      toast.error("Stripe is not configured yet.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = (await res.json()) as { url?: string; status?: ArtistConnectStatus; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start Stripe setup");
      }
      if (data.status) setStatus(data.status);
      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Stripe setup failed");
      setLoading(false);
    }
  }

  const title =
    status === "not_connected"
      ? "Get Paid on LiveCircuit"
      : status === "ready"
        ? "Payments Ready"
        : status === "verification_pending"
          ? "Stripe is reviewing your payment information"
          : status === "restricted"
            ? "Payment setup needs attention"
            : "Finish Payment Setup";

  const description =
    status === "not_connected"
      ? "Connect a Stripe account before you can receive ticket revenue from LiveCircuit."
      : status === "ready"
        ? "Ticket earnings stay pending for 7 days, then become available for bank payout through Stripe."
        : status === "verification_pending"
          ? "Stripe is verifying your details. LiveCircuit will enable payouts only after Stripe confirms your account can receive funds."
          : status === "restricted"
            ? "Stripe needs additional information before payouts can be enabled."
            : "Complete Stripe onboarding so LiveCircuit can allocate ticket revenue to your account.";

  const primaryLabel =
    status === "not_connected"
      ? "Set Up Payments"
      : status === "ready"
        ? "Manage Stripe Account"
        : status === "verification_pending"
          ? "View Stripe Setup"
          : "Continue Stripe Setup";

  const primaryMode: "onboarding" | "manage" = status === "ready" ? "manage" : "onboarding";

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Payments / Artist Payouts</CardTitle>
          <CardDescription>
            Stripe Connect Express — ticket revenue is split 90% artist / 10% LiveCircuit at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-lg font-semibold">{title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
              Connect status: {artistConnectStatusLabel(status)}
            </p>
          </div>

          {!stripeConfigured ? (
            <p className="text-sm text-amber-600">Stripe is not configured in this environment yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button disabled={loading} onClick={() => startFlow(primaryMode)}>
                {loading ? "Redirecting…" : primaryLabel}
              </Button>
              {status !== "not_connected" && status !== "ready" ? (
                <Button disabled={loading} variant="outline" onClick={() => startFlow("onboarding")}>
                  Restart Stripe setup
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total earned</CardDescription>
            <CardTitle className="text-2xl">{formatUsd(balance.lifetimeArtistEarningsCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl">{formatUsd(balance.pendingCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available</CardDescription>
            <CardTitle className="text-2xl">{formatUsd(balance.availableCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid out</CardDescription>
            <CardTitle className="text-2xl">{formatUsd(balance.paidOutCents)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {balance.receivableCents > 0 ? (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardDescription>Recovery due</CardDescription>
            <CardTitle className="text-lg text-amber-600">{formatUsd(balance.receivableCents)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Refunds after payout may require manual recovery. LiveCircuit support will follow up if needed.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
          <CardDescription>Bank payouts from your connected Stripe account.</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Initiated</th>
                    <th className="py-2 pr-4">Completed</th>
                    <th className="py-2 pr-4">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-border/60">
                      <td className="py-3 pr-4 tabular-nums">{formatUsd(Number(p.amount_cents ?? 0))}</td>
                      <td className="py-3 pr-4 uppercase text-xs">{p.status}</td>
                      <td className="py-3 pr-4">{formatDate(p.initiated_at)}</td>
                      <td className="py-3 pr-4">{formatDate(p.completed_at)}</td>
                      <td className="py-3 pr-4 font-mono text-xs">{p.stripe_payout_id ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ticket transactions</CardTitle>
          <CardDescription>Locked economics from each paid ticket order.</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid ticket revenue recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Gross</th>
                    <th className="py-2 pr-4">LiveCircuit fee</th>
                    <th className="py-2 pr-4">Artist earnings</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Available date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.orderId} className="border-b border-border/60">
                      <td className="py-3 pr-4">{tx.eventTitle ?? "Ticket sale"}</td>
                      <td className="py-3 pr-4 tabular-nums">{formatUsd(tx.grossCents)}</td>
                      <td className="py-3 pr-4 tabular-nums">{formatUsd(tx.platformFeeCents)}</td>
                      <td className="py-3 pr-4 tabular-nums">{formatUsd(tx.artistEarningsCents)}</td>
                      <td className="py-3 pr-4 uppercase text-xs tracking-wide text-muted-foreground">
                        {tx.payoutStatus}
                      </td>
                      <td className="py-3 pr-4">{formatDate(tx.availableAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
