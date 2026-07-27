"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  Download,
  Mail,
  Printer,
  Sparkles,
} from "lucide-react";
import { CustomizeVenueStep } from "@/components/demo/naming-rights/customize-venue-step";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { PricingLegalNote } from "@/components/pricing/sponsor/pricing-legal-note";
import { Button } from "@/components/ui/button";
import { formatCompact, formatCurrency } from "@/lib/demo/naming-rights-utils";
import {
  ARENA_TIER_META,
  CONTRACT_LENGTH_OPTIONS,
  FOUNDER_SPONSOR_PRICING,
  PAYMENT_OPTIONS,
  PRICE_MY_SPONSORSHIP,
  SPONSORSHIP_ADDONS,
  type ArenaTierId,
  type ContractLengthYears,
  type SponsorshipAddonId,
} from "@/lib/pricing/livecircuit-pricing";
import { compareTierQuotes } from "@/lib/pricing/sponsorship-quote-utils";
import { cn } from "@/lib/utils";

const CONFIGURATOR_STEPS = [
  "Select Venue",
  "Contract Length",
  "Payment Options",
  "Add-Ons",
  "Customization",
  "Summary",
  "ROI",
  "Package Score",
  "Compare",
  "Proposal",
] as const;

export function PriceMySponsorship({ compact }: { compact?: boolean }) {
  const [configStep, setConfigStep] = useState(0);
  const ctx = useSponsorVisualizer();
  const {
    form,
    updateForm,
    displayCompany,
    arenaName,
    theme,
    resetKey,
    selectedTier,
    quotePaymentOption,
    setQuotePaymentOption,
    selectedAddonIds,
    toggleAddon,
    compareTierA,
    compareTierB,
    setCompareTierA,
    setCompareTierB,
    sponsorshipQuote: quote,
  } = ctx;

  const mailBase = encodeURIComponent(displayCompany);
  const comparison = compareTierQuotes(
    compareTierA,
    compareTierB,
    form.contractYears as ContractLengthYears,
    quotePaymentOption,
    selectedAddonIds
  );

  function next() {
    setConfigStep((s) => Math.min(CONFIGURATOR_STEPS.length - 1, s + 1));
  }
  function prev() {
    setConfigStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className={cn("space-y-8", compact && "space-y-6")}>
      {!compact ? (
        <FadeUp className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">Enterprise Configurator</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{PRICE_MY_SPONSORSHIP.title}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{PRICE_MY_SPONSORSHIP.subtitle}</p>
        </FadeUp>
      ) : null}

      <FounderIncentiveBanner />

      {/* Progress */}
      <div className="glass-panel overflow-x-auto rounded-2xl p-4">
        <div className="flex min-w-max gap-1">
          {CONFIGURATOR_STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setConfigStep(i)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition",
                i === configStep ? "bg-primary/20 text-primary" : i < configStep ? "text-emerald-400" : "text-muted-foreground"
              )}
            >
              <span className={cn("flex size-6 items-center justify-center rounded-full text-[10px] font-bold", i <= configStep ? "bg-primary/30" : "bg-white/10")}>
                {i < configStep ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={configStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {configStep === 0 && <StepVenue form={form} updateForm={updateForm} />}
          {configStep === 1 && <StepContract form={form} updateForm={updateForm} />}
          {configStep === 2 && <StepPayment quotePaymentOption={quotePaymentOption} setQuotePaymentOption={setQuotePaymentOption} quote={quote} />}
          {configStep === 3 && <StepAddons selectedAddonIds={selectedAddonIds} toggleAddon={toggleAddon} />}
          {configStep === 4 && <StepCustomization />}
          {configStep === 5 && <StepSummary quote={quote} arenaName={arenaName} paymentOption={quotePaymentOption} resetKey={resetKey} />}
          {configStep === 6 && <StepRoi quote={quote} resetKey={resetKey} theme={theme} />}
          {configStep === 7 && <StepPackageScore quote={quote} resetKey={resetKey} theme={theme} />}
          {configStep === 8 && (
            <StepCompare
              compareTierA={compareTierA}
              compareTierB={compareTierB}
              setCompareTierA={setCompareTierA}
              setCompareTierB={setCompareTierB}
              comparison={comparison}
            />
          )}
          {configStep === 9 && (
            <StepProposal
              quote={quote}
              displayCompany={displayCompany}
              arenaName={arenaName}
              theme={theme}
              form={form}
              mailBase={mailBase}
              resetKey={resetKey}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={prev} disabled={configStep === 0}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <p className="text-sm text-muted-foreground">
          Step {configStep + 1} of {CONFIGURATOR_STEPS.length}
        </p>
        {configStep < CONFIGURATOR_STEPS.length - 1 ? (
          <Button onClick={next}>
            Continue
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button href={`mailto:${PRICE_MY_SPONSORSHIP.contact.email}?subject=Reserve%20Founder%20Pricing%20-%20${mailBase}`}>
            Reserve Founder Pricing
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>

      {/* Live quote sidebar on desktop */}
      <LiveQuoteStrip quote={quote} resetKey={resetKey} theme={theme} />
    </div>
  );
}

function FounderIncentiveBanner() {
  const { founderIncentive } = PRICE_MY_SPONSORSHIP;
  return (
    <FadeUp>
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 p-6 sm:p-8" style={{ background: "linear-gradient(135deg, oklch(0.15 0.03 280), oklch(0.12 0.02 280))" }}>
      <div className="flex items-start gap-3">
        <Sparkles className="size-5 shrink-0 text-amber-400" />
        <div>
          <h3 className="text-xl font-bold text-amber-400">{founderIncentive.headline}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{founderIncentive.subheadline}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {founderIncentive.benefits.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm">
                <Check className="size-3.5 text-emerald-400" /> {b}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs italic text-muted-foreground">{founderIncentive.disclaimer}</p>
        </div>
      </div>
    </div>
    </FadeUp>
  );
}

function StepVenue({ form, updateForm }: { form: ReturnType<typeof useSponsorVisualizer>["form"]; updateForm: ReturnType<typeof useSponsorVisualizer>["updateForm"] }) {
  return (
    <div>
      <StepTitle step={1} title="Select Your Venue" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ARENA_TIER_META.map((tier) => {
          const founder = FOUNDER_SPONSOR_PRICING[tier.id];
          const selected = form.tierId === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => updateForm({ tierId: tier.id, monthlyBudget: founder.monthly })}
              className={cn("glass-panel rounded-2xl p-5 text-left transition hover:border-primary/30", selected && "border-primary/50 ring-1 ring-primary/30")}
            >
              <h4 className="font-bold">{tier.name}</h4>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Capacity</dt><dd>{tier.maxCapacity.toLocaleString()}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Annual Events</dt><dd>{tier.annualEvents}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Est. Reach</dt><dd>{formatCompact(tier.monthlyVisitors * 12)}/yr</dd></div>
                <div className="flex justify-between border-t border-white/10 pt-2"><dt className="text-muted-foreground">Founder Price</dt><dd className="font-bold text-emerald-400">{formatCurrency(founder.annual)}/yr</dd></div>
              </dl>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepContract({ form, updateForm }: { form: ReturnType<typeof useSponsorVisualizer>["form"]; updateForm: ReturnType<typeof useSponsorVisualizer>["updateForm"] }) {
  return (
    <div>
      <StepTitle step={2} title="Contract Length" />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {CONTRACT_LENGTH_OPTIONS.map((opt) => {
          const selected = form.contractYears === opt.years;
          return (
            <button
              key={opt.years}
              type="button"
              onClick={() => updateForm({ contractYears: opt.years })}
              className={cn("glass-panel rounded-2xl p-6 text-left transition", selected && "border-amber-500/40 ring-1 ring-amber-500/30")}
            >
              <p className="text-2xl font-bold">{opt.label}</p>
              <p className="mt-2 text-sm font-semibold text-amber-400">{opt.subtitle}</p>
              {opt.benefits.map((b) => (
                <p key={b} className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Check className="size-3 text-emerald-400" /> {b}</p>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepPayment({
  quotePaymentOption,
  setQuotePaymentOption,
  quote,
}: {
  quotePaymentOption: ReturnType<typeof useSponsorVisualizer>["quotePaymentOption"];
  setQuotePaymentOption: ReturnType<typeof useSponsorVisualizer>["setQuotePaymentOption"];
  quote: ReturnType<typeof useSponsorVisualizer>["sponsorshipQuote"];
}) {
  return (
    <div>
      <StepTitle step={3} title="Payment Options" />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {PAYMENT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setQuotePaymentOption(opt.id)}
            className={cn("glass-panel rounded-2xl p-6 text-left", quotePaymentOption === opt.id && "border-primary/40 ring-1 ring-primary/30")}
          >
            <p className="text-xl font-bold">{opt.label}</p>
            <p className="mt-2 text-sm text-muted-foreground">{opt.description}</p>
          </button>
        ))}
      </div>
      <div className="glass-panel mt-6 rounded-2xl p-6">
        <p className="text-sm font-semibold">Payment Breakdown</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt>Annual total</dt><dd className="font-bold">{formatCurrency(quote.annualTotalPerYear)}</dd></div>
          <div className="flex justify-between"><dt>Your payment</dt><dd className="font-bold text-primary">{formatCurrency(quote.paymentAmount)} {quote.paymentLabel}</dd></div>
          <div className="flex justify-between text-muted-foreground"><dt>Monthly equivalent</dt><dd>{formatCurrency(quote.monthlyEquivalent)}/mo</dd></div>
          {quote.setupFee > 0 ? (
            <div className="flex justify-between border-t border-white/10 pt-2"><dt>One-time setup</dt><dd>{formatCurrency(quote.setupFee)}</dd></div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}

function StepAddons({
  selectedAddonIds,
  toggleAddon,
}: {
  selectedAddonIds: SponsorshipAddonId[];
  toggleAddon: (id: SponsorshipAddonId) => void;
}) {
  return (
    <div>
      <StepTitle step={4} title="Select Add-Ons" subtitle="Optional upgrades to maximize your sponsorship." />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {SPONSORSHIP_ADDONS.map((addon) => {
          const selected = selectedAddonIds.includes(addon.id);
          return (
            <button
              key={addon.id}
              type="button"
              onClick={() => toggleAddon(addon.id)}
              className={cn("glass-panel rounded-xl p-4 text-left transition", selected && "border-emerald-500/40 bg-emerald-500/5")}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{addon.label}</p>
                {selected ? <Check className="size-4 shrink-0 text-emerald-400" /> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{addon.description}</p>
              <p className="mt-3 text-sm font-bold text-primary">
                {formatCurrency(addon.monthlyCost)}/mo · {formatCurrency(addon.annualCost)}/yr
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepCustomization() {
  return (
    <div>
      <StepTitle step={5} title="Customization" subtitle="Your brand updates across the entire Sponsor Visualizer instantly." />
      <div className="mt-6"><CustomizeVenueStep /></div>
    </div>
  );
}

function StepSummary({
  quote,
  arenaName,
  paymentOption,
  resetKey,
}: {
  quote: ReturnType<typeof useSponsorVisualizer>["sponsorshipQuote"];
  arenaName: string;
  paymentOption: string;
  resetKey: string;
}) {
  const metrics = [
    { label: "Estimated Reach", value: quote.roi.estimatedReach },
    { label: "Brand Impressions", value: quote.roi.brandImpressions },
    { label: "Livestream Views", value: quote.roi.livestreamViews },
    { label: "Email Exposure", value: quote.roi.emailOpens },
    { label: "Push Notifications", value: quote.roi.pushNotifications },
    { label: "Social Reach", value: quote.roi.socialShares },
    { label: "Repeat Visitors", value: quote.roi.repeatVisitors },
  ];

  return (
    <div>
      <StepTitle step={6} title="Sponsorship Summary" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass-panel space-y-3 rounded-2xl p-6 text-sm">
          {[
            ["Venue", quote.tierName],
            ["Arena", arenaName],
            ["Contract", `${quote.contractYears} Year${quote.contractYears > 1 ? "s" : ""}`],
            ["Payment", paymentOption],
            ["Add-ons", quote.selectedAddons.length ? quote.selectedAddons.map((a) => a.label).join(", ") : "None"],
            ["Founder Pricing", formatCurrency(quote.annualTotalPerYear) + "/yr"],
            ["Est. Savings", formatCurrency(quote.estimatedSavings)],
            ["Monthly Payment", formatCurrency(quote.monthlyEquivalent)],
            ["Annual Payment", formatCurrency(quote.annualTotalPerYear)],
            ["Setup Fee", formatCurrency(quote.setupFee)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-white/5 pb-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="max-w-[60%] text-right font-medium">{v}</dd>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((m) => (
            <div key={m.label} className="glass-panel rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                <AnimatedCounter value={m.value} resetKey={resetKey} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepRoi({
  quote,
  resetKey,
  theme,
}: {
  quote: ReturnType<typeof useSponsorVisualizer>["sponsorshipQuote"];
  resetKey: string;
  theme: ReturnType<typeof useSponsorVisualizer>["theme"];
}) {
  const items = [
    { label: "Cost Per Event", value: quote.costPerEvent, format: "currency" as const },
    { label: "Cost Per Impression", value: quote.costPerImpression, format: "decimal" as const },
    { label: "CPM", value: quote.cpm, format: "decimal" as const },
    { label: "Est. Fan Touchpoints", value: quote.estimatedFanTouchpoints, format: "compact" as const },
    { label: "Est. Digital Reach", value: quote.roi.estimatedReach, format: "compact" as const },
  ];

  return (
    <div>
      <StepTitle step={7} title="Return on Investment" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            className="glass-panel rounded-2xl p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: theme.gold }}>
              {item.format === "currency" ? (
                <>${<AnimatedCounter value={Math.round(item.value)} format="number" resetKey={resetKey} />}</>
              ) : item.format === "decimal" ? (
                `$${item.value.toFixed(4)}`
              ) : (
                <AnimatedCounter value={item.value} resetKey={resetKey} />
              )}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StepPackageScore({
  quote,
  resetKey,
  theme,
}: {
  quote: ReturnType<typeof useSponsorVisualizer>["sponsorshipQuote"];
  resetKey: string;
  theme: ReturnType<typeof useSponsorVisualizer>["theme"];
}) {
  return (
    <div className="text-center">
      <StepTitle step={8} title="Package Score" />
      <div className="glass-panel mx-auto mt-8 max-w-lg rounded-3xl p-10">
        <p className="text-6xl font-bold tabular-nums" style={{ color: theme.gold }}>
          <AnimatedCounter value={quote.packageScore} format="number" resetKey={resetKey} />
          <span className="text-3xl text-muted-foreground"> / 100</span>
        </p>
        <p className="mt-4 text-2xl font-bold text-emerald-400">{quote.packageScoreLabel}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{quote.packageScoreExplanation}</p>
        <div className="mx-auto mt-6 h-2 max-w-xs overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            style={{ background: theme.gradient }}
            initial={{ width: 0 }}
            animate={{ width: `${quote.packageScore}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </div>
  );
}

function StepCompare({
  compareTierA,
  compareTierB,
  setCompareTierA,
  setCompareTierB,
  comparison,
}: {
  compareTierA: ArenaTierId;
  compareTierB: ArenaTierId;
  setCompareTierA: (v: ArenaTierId) => void;
  setCompareTierB: (v: ArenaTierId) => void;
  comparison: ReturnType<typeof compareTierQuotes>;
}) {
  return (
    <div>
      <StepTitle step={9} title="Compare Packages" />
      <div className="mt-6 flex flex-wrap gap-4">
        <select value={compareTierA} onChange={(e) => setCompareTierA(e.target.value as ArenaTierId)} className="rounded-xl border border-white/10 bg-background px-4 py-2 text-sm">
          {ARENA_TIER_META.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span className="self-center text-muted-foreground">vs</span>
        <select value={compareTierB} onChange={(e) => setCompareTierB(e.target.value as ArenaTierId)} className="rounded-xl border border-white/10 bg-background px-4 py-2 text-sm">
          {ARENA_TIER_META.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="glass-panel mt-6 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-muted-foreground">
              <th className="p-4">Metric</th>
              <th className="p-4">{comparison.quoteA.tierName}</th>
              <th className="p-4">{comparison.quoteB.tierName}</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.label} className="border-b border-white/5">
                <td className="p-4 text-muted-foreground">{row.label}</td>
                <td className="p-4 font-semibold">
                  {row.format === "currency" ? formatCurrency(row.a as number) : row.format === "cpm" ? `$${(row.a as number).toFixed(2)}` : (row.a as number).toLocaleString()}
                </td>
                <td className="p-4 font-semibold">
                  {row.format === "currency" ? formatCurrency(row.b as number) : row.format === "cpm" ? `$${(row.b as number).toFixed(2)}` : (row.b as number).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StepProposal({
  quote,
  displayCompany,
  arenaName,
  theme,
  form,
  mailBase,
  resetKey,
}: {
  quote: ReturnType<typeof useSponsorVisualizer>["sponsorshipQuote"];
  displayCompany: string;
  arenaName: string;
  theme: ReturnType<typeof useSponsorVisualizer>["theme"];
  form: ReturnType<typeof useSponsorVisualizer>["form"];
  mailBase: string;
  resetKey: string;
}) {
  const { contact } = PRICE_MY_SPONSORSHIP;

  return (
    <div>
      <StepTitle step={10} title="Your Proposal" />
      <div className="glass-panel mt-6 overflow-hidden rounded-3xl border border-white/10">
        <div className="px-8 py-10 sm:px-12" style={{ background: `linear-gradient(135deg, ${theme.primary}22, transparent)` }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Prepared For</p>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <SponsorBrandLogo theme={theme} logoUrl={form.logoUrl} size="lg" />
            <div>
              <h3 className="text-3xl font-bold">{displayCompany}</h3>
              <p className="text-muted-foreground">{form.industry} · {form.state}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-px bg-white/5 sm:grid-cols-2">
          {[
            ["Venue", quote.tierName],
            ["Arena", arenaName],
            ["Contract", `${quote.contractYears} years`],
            ["Total Investment", formatCurrency(quote.totalContractValue)],
            ["Founder Savings", formatCurrency(quote.estimatedSavings)],
            ["Package Score", `${quote.packageScore}/100`],
            ["Est. Reach", formatCompact(quote.roi.estimatedReach)],
            ["Brand Impressions", formatCompact(quote.roi.brandImpressions)],
          ].map(([k, v]) => (
            <div key={k} className="bg-card/40 p-5">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="mt-1 font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">Executive Summary</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {displayCompany} is prepared for a {quote.contractYears}-year founding sponsorship at {arenaName}. This package
            delivers an estimated <AnimatedCounter value={quote.roi.estimatedReach} resetKey={resetKey} /> fan reach with{" "}
            {quote.selectedAddons.length} premium add-on{quote.selectedAddons.length !== 1 ? "s" : ""}, locking in Founder
            Pricing before public rates take effect.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-white/10 p-6">
          <Button variant="outline" disabled><Download className="size-4" /> Download Proposal</Button>
          <Button variant="outline" disabled><Printer className="size-4" /> Print Proposal</Button>
          <Button variant="outline" href={`mailto:${contact.email}?subject=Proposal%20-%20${mailBase}`}><Mail className="size-4" /> Email Proposal</Button>
          <Button variant="secondary" href={`mailto:${contact.email}?subject=Schedule%20Meeting%20-%20${mailBase}`}><Calendar className="size-4" /> Schedule Meeting</Button>
          <Button href={`mailto:${contact.email}?subject=Reserve%20Founder%20Pricing%20-%20${mailBase}`}>Reserve Founder Pricing</Button>
        </div>
      </div>
      <div className="mt-6"><PricingLegalNote /></div>
    </div>
  );
}

function LiveQuoteStrip({
  quote,
  resetKey,
  theme,
}: {
  quote: ReturnType<typeof useSponsorVisualizer>["sponsorshipQuote"];
  resetKey: string;
  theme: ReturnType<typeof useSponsorVisualizer>["theme"];
}) {
  return (
    <div className="glass-panel sticky bottom-4 z-10 hidden rounded-2xl border border-white/10 p-4 lg:flex lg:items-center lg:justify-between">
      <div>
        <p className="text-xs text-muted-foreground">Live Quote</p>
        <p className="text-xl font-bold" style={{ color: theme.gold }}>
          {formatCurrency(quote.totalContractValue)} <span className="text-sm font-normal text-muted-foreground">total contract</span>
        </p>
      </div>
      <div className="flex gap-8 text-sm">
        <div><p className="text-muted-foreground">Savings</p><p className="font-bold text-emerald-400">{formatCurrency(quote.estimatedSavings)}</p></div>
        <div><p className="text-muted-foreground">Score</p><p className="font-bold"><AnimatedCounter value={quote.packageScore} format="number" resetKey={resetKey} />/100</p></div>
        <div><p className="text-muted-foreground">Payment</p><p className="font-bold">{formatCurrency(quote.paymentAmount)} {quote.paymentLabel}</p></div>
      </div>
    </div>
  );
}

function StepTitle({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step {step}</p>
      <h3 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h3>
      {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
