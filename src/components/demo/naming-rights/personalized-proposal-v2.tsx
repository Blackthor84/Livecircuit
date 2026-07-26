import { Check } from "lucide-react";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { NAMING_RIGHTS_BENEFITS } from "@/lib/demo/naming-rights-data";
import {
  formatCompact,
  formatCurrency,
  type BrandTheme,
} from "@/lib/demo/naming-rights-utils";

export function PersonalizedProposalV2({
  companyName,
  arenaName,
  state,
  tierName,
  industry,
  estimatedReach,
  brandExposure,
  contractYears,
  totalInvestment,
  investmentRange,
  theme,
  logoUrl,
}: {
  companyName: string;
  arenaName: string;
  state: string;
  tierName: string;
  industry: string;
  estimatedReach: number;
  brandExposure: string;
  contractYears: number;
  totalInvestment: number;
  investmentRange: string;
  theme: BrandTheme;
  logoUrl?: string | null;
}) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl border-amber-500/20">
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-transparent to-primary/10 px-6 py-8 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">
              Official LiveCircuit Naming Rights Proposal
            </p>
            <h3 className="mt-3 text-2xl font-bold sm:text-3xl">Prepared For</h3>
            <p className="mt-1 text-xl text-primary">{companyName}</p>
            <p className="mt-2 text-sm text-muted-foreground">{industry}</p>
          </div>
          <SponsorBrandLogo theme={theme} logoUrl={logoUrl} size="lg" />
        </div>
      </div>

      <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2">
        <dl className="space-y-4">
          {[
            { label: "Selected state", value: state },
            { label: "Selected venue", value: arenaName },
            { label: "Venue tier", value: tierName },
            { label: "Estimated reach", value: `${formatCompact(estimatedReach)} / month` },
            { label: "Brand exposure", value: brandExposure },
            { label: "Investment range", value: investmentRange },
            { label: "Suggested contract", value: `${contractYears} years` },
            { label: "Total investment", value: formatCurrency(totalInvestment) },
            { label: "Timeline", value: "90-day launch · quarterly business reviews" },
          ].map((row) => (
            <div key={row.label} className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="max-w-[55%] text-right font-semibold">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="font-semibold">Marketing benefits</p>
          <ul className="mt-4 space-y-2">
            {NAMING_RIGHTS_BENEFITS.slice(0, 8).map((benefit) => (
              <li key={benefit.title} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-amber-400" />
                {benefit.title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
