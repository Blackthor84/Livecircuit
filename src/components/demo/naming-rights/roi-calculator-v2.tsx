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
  calculateRoiV2,
  formatCompact,
  formatCurrency,
  type BrandTheme,
} from "@/lib/demo/naming-rights-utils";
import { cn } from "@/lib/utils";

export function RoiCalculatorV2({
  monthlyBudget,
  contractYears,
  tierId,
  onBudgetChange,
  onYearsChange,
  onTierChange,
  theme,
}: {
  monthlyBudget: number;
  contractYears: number;
  tierId: string;
  onBudgetChange: (v: number) => void;
  onYearsChange: (v: number) => void;
  onTierChange: (v: string) => void;
  theme: BrandTheme;
}) {
  const roi = calculateRoiV2({ monthlyBudget, contractYears, tierId });

  return (
    <div className="glass-panel overflow-hidden rounded-2xl border-amber-500/10">
      <div className="grid lg:grid-cols-2">
        <div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <h3 className="text-xl font-bold">ROI Calculator</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Realistic demo projections — not a binding quote.
          </p>
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label>Venue tier</Label>
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
            <div className="space-y-2">
              <Label htmlFor="years">Contract length (years)</Label>
              <Input
                id="years"
                type="number"
                min={1}
                max={10}
                value={contractYears}
                onChange={(e) => onYearsChange(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
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
          </div>
        </div>

        <div className="p-6 sm:p-8" style={{ background: `${theme.primary}08` }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.gold }}>
            Projected outcomes
          </p>
          <dl className="mt-6 space-y-5">
            {[
              { label: "Estimated reach", value: formatCompact(roi.estimatedReach) + " / mo" },
              { label: "Brand impressions", value: formatCompact(roi.estimatedImpressions) },
              { label: "Cost per impression", value: `$${roi.costPerImpression.toFixed(3)}` },
              { label: "Estimated ROI", value: `${Math.round(240 + roi.estimatedValue / 10000)}%`, highlight: true },
              { label: "Annual exposure", value: formatCompact(roi.estimatedBrandExposure) + " / yr" },
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
