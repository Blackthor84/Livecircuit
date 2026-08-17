"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArtistTicketEarningsExample } from "@/components/artist/artist-ticket-earnings-example";
import type { ArtistBalanceSummary, ArtistTicketTransaction } from "@/lib/services/artist-balance.service";
import {
  buildPayoutDelayReasons,
  calculateTicketEarningsExample,
  EARNINGS_FLOW_STEPS,
  formatPayoutDelayDays,
  formatUsdFromCents,
  ORDER_PAYOUT_STATUS_DEFINITIONS,
  PAYOUT_FLOW_STEPS,
  type ArtistEarningsDisplayConfig,
} from "@/lib/monetization/artist-earnings-display";
import { cn } from "@/lib/utils";

type Props = {
  config: ArtistEarningsDisplayConfig;
  balance: ArtistBalanceSummary;
  transactions: ArtistTicketTransaction[];
};

export function ArtistEarningsTransparency({ config, balance, transactions }: Props) {
  const [faqOpen, setFaqOpen] = useState(false);
  const exampleSplit = calculateTicketEarningsExample(2000, config.platformFeePercent);
  const delayReasons = buildPayoutDelayReasons(config);

  const heldCount = transactions.filter((tx) => tx.payoutStatus === "held").length;
  const refundedCount = transactions.filter((tx) =>
    ["refunded", "partially_refunded"].includes(tx.payoutStatus),
  ).length;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Artist Earnings &amp; Payouts</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">How Your Earnings Work</h1>
        <p className="max-w-3xl text-muted-foreground">
          LiveCircuit shows you exactly how your ticket revenue is calculated and when your money becomes available.
        </p>
      </header>

      <section aria-labelledby="earnings-flow-heading">
        <h2 id="earnings-flow-heading" className="sr-only">
          Earnings flow
        </h2>
        <Card>
          <CardContent className="pt-6">
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {EARNINGS_FLOW_STEPS.map((step, index) => (
                <li key={step} className="relative flex flex-col items-center text-center">
                  {index < EARNINGS_FLOW_STEPS.length - 1 ? (
                    <span
                      aria-hidden
                      className="absolute left-[calc(50%+1.25rem)] top-5 hidden h-px w-[calc(100%-2.5rem)] bg-border xl:block"
                    />
                  ) : null}
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="example-heading" className="grid gap-6 lg:grid-cols-2">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle id="example-heading">$20 ticket example</CardTitle>
            <CardDescription>
              Based on the current {config.platformFeePercent}% {config.platformFeeLabel.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-3">
              <Row label="Fan pays" value={formatUsdFromCents(exampleSplit.grossCents)} />
              <Row
                label={`LiveCircuit platform fee`}
                value={`−${formatUsdFromCents(exampleSplit.platformFeeCents)} (${exampleSplit.platformFeePercent}%)`}
                muted
              />
              <Row
                label="Artist earnings"
                value={formatUsdFromCents(exampleSplit.artistEarningsCents)}
                highlight
              />
              <Row label="Stripe processing fee" value="Paid by LiveCircuit" muted />
              <Row label="Artist receives" value={formatUsdFromCents(exampleSplit.artistEarningsCents)} highlight />
            </dl>
            <p className="text-sm text-muted-foreground">
              Stripe processing fees are payment-processing costs paid by LiveCircuit. Actual Stripe fees can vary by
              payment method and transaction.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Try your own ticket price</CardTitle>
            <CardDescription>Informational calculator using the current platform fee configuration.</CardDescription>
          </CardHeader>
          <CardContent>
            <ArtistTicketEarningsExample config={config} />
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="where-money-goes-heading">
        <h2 id="where-money-goes-heading" className="mb-4 text-xl font-semibold">
          Where the money goes
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard
            title="LiveCircuit fee"
            body={`LiveCircuit retains its configured ${config.platformFeeLabel.toLowerCase()} (${config.platformFeePercent}%) from each paid ticket. This fee is disclosed before you publish.`}
          />
          <InfoCard
            title="Stripe processing"
            body={`Stripe processes fan payments. ${config.paymentProcessingDescription} Processing costs are handled by LiveCircuit according to the platform's current payment architecture.`}
          />
          <InfoCard
            title="Your earnings"
            body="The artist earnings LiveCircuit displays are the amount tracked as belonging to you before payout processing — after the LiveCircuit platform fee is applied."
          />
        </div>
      </section>

      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="mb-4 text-xl font-semibold">
          Payout timeline
        </h2>
        <div className="space-y-4">
          {PAYOUT_FLOW_STEPS.map((step, index) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                {index < PAYOUT_FLOW_STEPS.length - 1 ? (
                  <span className="mt-2 h-full w-px bg-border" aria-hidden />
                ) : null}
              </div>
              <div className="pb-4">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {index === 2
                    ? `${step.subtitle} LiveCircuit currently uses a ${formatPayoutDelayDays(config.payoutDelayDays)} eligibility period for ticket earnings.`
                    : step.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="status-heading">
        <h2 id="status-heading" className="mb-4 text-xl font-semibold">
          Payout status guide
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">What it means</th>
                  </tr>
                </thead>
                <tbody>
                  {ORDER_PAYOUT_STATUS_DEFINITIONS.map((row) => (
                    <tr key={row.status} className="border-b border-border/60 align-top">
                      <td className="py-3 pr-4 font-semibold uppercase tracking-wide">{row.label}</td>
                      <td className="py-3 text-muted-foreground">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="faq-heading">
        <Card>
          <button
            type="button"
            id="faq-heading"
            className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            onClick={() => setFaqOpen((open) => !open)}
            aria-expanded={faqOpen}
          >
            <div>
              <CardTitle className="text-lg">Why hasn&apos;t my money arrived yet?</CardTitle>
              <CardDescription className="mt-1 text-left">
                Common reasons based on LiveCircuit&apos;s payout eligibility rules
              </CardDescription>
            </div>
            <ChevronDown className={cn("size-5 shrink-0 transition-transform", faqOpen && "rotate-180")} />
          </button>
          {faqOpen ? (
            <CardContent className="space-y-4 border-t pt-4">
              {delayReasons.map((item) => (
                <div key={item.title}>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </CardContent>
          ) : null}
        </Card>
      </section>

      <section aria-labelledby="minimum-heading">
        <Card>
          <CardHeader>
            <CardTitle id="minimum-heading">Minimum payout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">
                Minimum payout: {formatUsdFromCents(config.minPayoutCents)}
              </span>
            </p>
            <p>
              Your available earnings must meet the current minimum payout requirement before LiveCircuit can initiate
              a payout.
            </p>
            {config.reservePercent > 0 ? (
              <p>
                A reserve of {config.reservePercent}% may also be held back according to the current payout
                configuration.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="transparency-heading">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader>
            <CardTitle id="transparency-heading">Your earnings are never a mystery</CardTitle>
            <CardDescription>Live numbers from your LiveCircuit account</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Metric label="Available balance" value={formatUsdFromCents(balance.availableCents)} />
              <Metric label="Pending balance" value={formatUsdFromCents(balance.pendingCents)} />
              <Metric label="Paid out" value={formatUsdFromCents(balance.paidOutCents)} />
              <Metric label="Lifetime artist earnings" value={formatUsdFromCents(balance.lifetimeArtistEarningsCents)} />
              <Metric label="Lifetime ticket gross" value={formatUsdFromCents(balance.lifetimeGrossCents)} />
              <Metric
                label="Lifetime LiveCircuit fees"
                value={formatUsdFromCents(balance.lifetimePlatformFeeCents)}
              />
              {heldCount > 0 ? <Metric label="Orders on hold" value={String(heldCount)} /> : null}
              {refundedCount > 0 ? <Metric label="Refunded orders" value={String(refundedCount)} /> : null}
              {balance.receivableCents > 0 ? (
                <Metric label="Recovery due" value={formatUsdFromCents(balance.receivableCents)} />
              ) : null}
            </dl>
            {balance.availableCents >= config.minPayoutCents ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Your available balance meets the current minimum payout requirement. Payouts still require Stripe Connect
                settlement and a verified connected account.
              </p>
            ) : balance.availableCents > 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                You have {formatUsdFromCents(balance.availableCents)} available. The minimum payout is{" "}
                {formatUsdFromCents(config.minPayoutCents)}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <p className="text-sm text-muted-foreground">
        Manage Stripe Connect, payout history, and ticket transactions in{" "}
        <Link href="/artist/settings" className="text-primary hover:underline">
          Artist Settings → Payments
        </Link>
        .
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-3 last:border-0 last:pb-0">
      <dt className={cn("text-sm", muted && "text-muted-foreground", highlight && "font-medium")}>{label}</dt>
      <dd className={cn("tabular-nums", highlight ? "text-lg font-bold text-emerald-600 dark:text-emerald-400" : "font-semibold")}>
        {value}
      </dd>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-4">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
