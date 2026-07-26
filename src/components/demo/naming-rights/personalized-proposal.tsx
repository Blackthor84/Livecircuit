import { Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { PROPOSAL_BENEFITS } from "@/lib/demo/naming-rights-data";
import {
  formatCompact,
  formatCurrency,
  type BrandTheme,
} from "@/lib/demo/naming-rights-utils";

export function PersonalizedProposal({
  companyName,
  arenaName,
  tierName,
  estimatedReach,
  brandExposure,
  contractMonths,
  totalInvestment,
  theme,
}: {
  companyName: string;
  arenaName: string;
  tierName: string;
  estimatedReach: number;
  brandExposure: string;
  contractMonths: number;
  totalInvestment: number;
  theme: BrandTheme;
}) {
  const mailSubject = encodeURIComponent(`Naming Rights - ${companyName}`);

  return (
    <div className="glass-panel overflow-hidden rounded-2xl border-amber-500/20">
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-transparent to-primary/10 px-6 py-8 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">
              Official Naming Rights Proposal
            </p>
            <h3 className="mt-3 text-2xl font-bold sm:text-3xl">Prepared for</h3>
            <p className="mt-1 text-xl text-primary">{companyName}</p>
          </div>
          <SponsorBrandLogo theme={theme} size="lg" />
        </div>
      </div>

      <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2">
        <dl className="space-y-4">
          {[
            { label: "Recommended arena", value: arenaName },
            { label: "Suggested tier", value: tierName },
            { label: "Estimated reach", value: `${formatCompact(estimatedReach)} / month` },
            { label: "Brand exposure", value: brandExposure },
            { label: "Contract length", value: `${contractMonths} months` },
            { label: "Total investment", value: formatCurrency(totalInvestment) },
          ].map((row) => (
            <div key={row.label} className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="max-w-[55%] text-right font-semibold">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="font-semibold">Benefits</p>
          <ul className="mt-4 space-y-2">
            {PROPOSAL_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-amber-400" />
                {benefit}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="secondary" disabled>
              <Download className="size-4" />
              Download Proposal
            </Button>
            <Button href={`mailto:partners@livecircuit.com?subject=${mailSubject}`}>
              Schedule Meeting
            </Button>
            <Button variant="outline" href={`mailto:partners@livecircuit.com?subject=Reserve%20Arena%20-%20${mailSubject}`}>
              Reserve Arena
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
