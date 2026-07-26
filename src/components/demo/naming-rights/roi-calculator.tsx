"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ARENA_TIER_OPTIONS } from "@/lib/demo/naming-rights-data";
import {
  calculateRoi,
  formatCompact,
  formatCurrency,
  type BrandTheme,
} from "@/lib/demo/naming-rights-utils";
import { cn } from "@/lib/utils";

export function RoiCalculator({
  monthlyBudget,
  contractMonths,
  tierId,
  onBudgetChange,
  onMonthsChange,
  onTierChange,
  theme,
}: {
  monthlyBudget: number;
  contractMonths: number;
  tierId: string;
  onBudgetChange: (v: number) => void;
  onMonthsChange: (v: number) => void;
  onTierChange: (v: string) => void;
  theme: BrandTheme;
}) {
  const roi = calculateRoi({ monthlyBudget, contractMonths, tierId });

  return (
    <div className="glass-panel overflow-hidden rounded-2xl border-amber-500/10">
      <div className="grid lg:grid-cols-2">
        <div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <h3 className="text-xl font-bold">ROI calculator</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Estimate your exposure with visualizer projections — not a binding quote.
          </p>
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="budget">Monthly sponsorship budget ($)</Label>
              <Input
                id="budget"
                type="number"
                min={1000}
                step={500}
                value={monthlyBudget}
                onChange={(e) => onBudgetChange(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="months">Contract length (months)</Label>
              <Input
                id="months"
                type="number"
                min={6}
                max={36}
                value={contractMonths}
                onChange={(e) => onMonthsChange(Number(e.target.value) || 12)}
              />
            </div>
            <div className="space-y-2">
              <Label>Arena tier</Label>
              <Select value={tierId} onValueChange={(v) => v && onTierChange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARENA_TIER_OPTIONS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8" style={{ background: `${theme.primary}08` }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.gold }}>
            Projected outcomes
          </p>
          <dl className="mt-6 space-y-5">
            {[
              { label: "Estimated visitors", value: formatCompact(roi.estimatedVisitors) },
              { label: "Estimated impressions", value: formatCompact(roi.estimatedImpressions) },
              { label: "Cost per impression", value: `$${roi.costPerImpression.toFixed(3)}` },
              { label: "Estimated sponsorship value", value: formatCurrency(roi.estimatedValue), highlight: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className={cn("text-lg font-bold", row.highlight && "text-amber-400")}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

export function ArenaTierCards() {
  const statusStyles = {
    Available: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    Premium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    Limited: "border-red-500/30 bg-red-500/10 text-red-400",
  };

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {ARENA_TIER_OPTIONS.map((tier) => (
        <li
          key={tier.id}
          className="glass-panel group rounded-xl p-5 transition hover:-translate-y-1 hover:border-amber-500/25"
        >
          <Badge className={statusStyles[tier.status]}>{tier.status}</Badge>
          <h3 className="mt-4 font-bold">{tier.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{tier.tagline}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Capacity</dt>
              <dd className="font-semibold">{tier.maxCapacity.toLocaleString()} concurrent</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Est. monthly visitors</dt>
              <dd className="font-semibold">{formatCompact(tier.monthlyVisitors)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Suggested annual investment</dt>
              <dd className="font-semibold text-amber-400">{formatCurrency(tier.annualInvestment)}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
