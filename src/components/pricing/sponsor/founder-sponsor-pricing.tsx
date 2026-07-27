"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PricingLegalNote } from "@/components/pricing/sponsor/pricing-legal-note";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import {
  ARENA_TIER_META,
  FOUNDER_BADGES,
  FOUNDER_BENEFITS,
  FOUNDER_PROGRAM,
  FOUNDER_SPONSOR_PRICING,
  FOUNDER_WHATS_INCLUDED,
  FUTURE_ENTERPRISE_PRICING,
  FUTURE_GROWTH_PRICING,
  SPONSOR_COMPARISON,
  getFounderSavings,
  getFounderSavingsPercent,
  type ArenaTierId,
} from "@/lib/pricing/livecircuit-pricing";
import { formatPricingCurrency } from "@/lib/pricing/artist-booking-utils";
import { getFounderSponsorRoi } from "@/lib/pricing/founder-sponsor-utils";
import { cn } from "@/lib/utils";

type Props = {
  selectedTierId?: ArenaTierId;
  contractYears?: number;
  compact?: boolean;
  showLegal?: boolean;
};

export function FounderSponsorPricing({
  selectedTierId = "theater",
  contractYears = 1,
  compact,
  showLegal = true,
}: Props) {
  const roi = getFounderSponsorRoi(selectedTierId, contractYears);
  const resetKey = `${selectedTierId}-${contractYears}`;

  return (
    <div className="space-y-12">
      <FadeUp className="text-center">
        <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-400">{FOUNDER_PROGRAM.badge}</Badge>
        <h2 className={cn("mt-4 font-bold tracking-tight", compact ? "text-3xl" : "text-4xl sm:text-5xl")}>
          {FOUNDER_PROGRAM.headline}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{FOUNDER_PROGRAM.subheadline}</p>
      </FadeUp>

      <FadeUp>
        <h3 className="mb-6 text-center text-2xl font-bold">{FOUNDER_PROGRAM.sectionTitle}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ARENA_TIER_META.map((tier, i) => {
            const pricing = FOUNDER_SPONSOR_PRICING[tier.id];
            const savings = getFounderSavings(tier.id);
            const savingsPct = getFounderSavingsPercent(tier.id);
            const isSelected = tier.id === selectedTierId;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "glass-panel rounded-2xl p-5 transition",
                  isSelected && "border-amber-500/40 ring-1 ring-amber-500/30"
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{tier.name}</p>
                <p className="mt-3 text-2xl font-bold text-emerald-400">{formatPricingCurrency(pricing.annual)}</p>
                <p className="text-xs text-muted-foreground">/year</p>
                <p className="mt-2 text-sm font-semibold">{formatPricingCurrency(pricing.monthly)}/mo</p>
                <div className="mt-4 space-y-1 border-t border-white/10 pt-4 text-[11px]">
                  <p className="text-muted-foreground line-through">
                    Regular: {formatPricingCurrency(pricing.regularAnnual)}/yr
                  </p>
                  <p className="font-semibold text-amber-400">
                    Save {formatPricingCurrency(savings)} ({savingsPct}%)
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </FadeUp>

      <FadeUp>
        <h3 className="mb-6 text-center text-xl font-bold">Future Value Illustration</h3>
        <p className="mb-6 text-center text-xs text-muted-foreground">
          Illustrative comparison only — not a guarantee of future pricing.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 pr-4">Venue</th>
                <th className="pb-3 pr-4">Founder</th>
                <th className="pb-3 pr-4">Growth</th>
                <th className="pb-3">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {ARENA_TIER_META.map((tier) => (
                <tr key={tier.id} className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium">{tier.name}</td>
                  <td className="py-3 pr-4 text-emerald-400">
                    {formatPricingCurrency(FOUNDER_SPONSOR_PRICING[tier.id].annual)}
                  </td>
                  <td className="py-3 pr-4">{formatPricingCurrency(FUTURE_GROWTH_PRICING[tier.id])}</td>
                  <td className="py-3 text-muted-foreground">{FUTURE_ENTERPRISE_PRICING[tier.id]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FadeUp>

      <FadeUpStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FOUNDER_BENEFITS.map((benefit) => (
          <FadeUpItem key={benefit.title}>
            <div className="glass-panel h-full rounded-2xl p-5">
              <Sparkles className="size-4 text-amber-400" />
              <h4 className="mt-3 font-semibold">{benefit.title}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          </FadeUpItem>
        ))}
      </FadeUpStagger>

      <FounderWhatsIncluded />

      <FadeUp className="glass-panel rounded-2xl border border-amber-500/20 p-6 text-center sm:p-8">
        <div className="flex items-center justify-center gap-2 text-amber-400">
          <Clock className="size-5" />
          <p className="text-sm font-semibold uppercase tracking-widest">{FOUNDER_PROGRAM.timerTitle}</p>
        </div>
        <p className="mt-2 text-lg font-bold">{FOUNDER_PROGRAM.timerSubtitle}</p>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground">{FOUNDER_PROGRAM.timerMessage}</p>
      </FadeUp>

      <FadeUp>
        <h3 className="mb-6 text-center text-xl font-bold">Founder Badges</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FOUNDER_BADGES.map((badge) => (
            <div key={badge.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-semibold">{badge.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{badge.description}</p>
            </div>
          ))}
        </div>
      </FadeUp>

      <FadeUp>
        <h3 className="mb-6 text-center text-xl font-bold">Sponsor ROI (Demo)</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Annual Events", value: roi.annualEvents },
            { label: "Estimated Reach", value: roi.estimatedReach },
            { label: "Livestream Views", value: roi.livestreamViews },
            { label: "Brand Impressions", value: roi.brandImpressions },
            { label: "Email Opens", value: roi.emailOpens },
            { label: "Push Notifications", value: roi.pushNotifications },
            { label: "Repeat Visitors", value: roi.repeatVisitors },
            { label: "Social Shares", value: roi.socialShares },
            { label: "Chat Engagement", value: roi.chatEngagement },
          ].map((m) => (
            <div key={m.label} className="glass-panel rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.label}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-primary">
                <AnimatedCounter value={m.value} resetKey={resetKey} />
              </p>
            </div>
          ))}
        </div>
      </FadeUp>

      <FadeUp>
        <h3 className="mb-6 text-center text-xl font-bold">Traditional vs LiveCircuit</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 p-6">
            <h4 className="font-bold text-muted-foreground">Traditional Arena Sponsorship</h4>
            <ul className="mt-4 space-y-2">
              {SPONSOR_COMPARISON.traditional.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-red-400">×</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
            <h4 className="font-bold text-amber-400">LiveCircuit Founder Sponsorship</h4>
            <ul className="mt-4 space-y-2">
              {SPONSOR_COMPARISON.livecircuit.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-400">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </FadeUp>

      {showLegal ? <PricingLegalNote /> : null}
    </div>
  );
}

function FounderWhatsIncluded() {
  const [open, setOpen] = useState(false);

  return (
    <FadeUp className="glass-panel rounded-2xl border border-white/10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-lg font-bold">What&apos;s Included</span>
        <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ul className="grid gap-2 border-t border-white/10 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3">
              {FOUNDER_WHATS_INCLUDED.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-400">✓</span> {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </FadeUp>
  );
}
