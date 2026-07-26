import { Check } from "lucide-react";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { formatCompact, formatCurrency, type BrandTheme } from "@/lib/demo/naming-rights-utils";

const PROPOSAL_SECTIONS = [
  { title: "Naming Rights", items: ["Permanent Venue Naming", "Homepage Placement", "Event Branding", "Digital Signage"] },
  { title: "Hospitality Benefits", items: ["VIP Hospitality", "Executive Networking", "VIP Lounge Access"] },
  { title: "Community Impact", items: ["Community Impact", "Local Activations", "Charity Partnerships"] },
  { title: "Brand Recognition", items: ["Brand Recognition", "Social Media", "Streaming Exposure", "Tickets"] },
];

export function SponsorshipPackageV3({
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
  slogan,
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
  slogan?: string;
}) {
  return (
    <div className="glass-panel overflow-hidden rounded-3xl border-amber-500/20">
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-transparent to-primary/10 px-6 py-8 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">
              Official LiveCircuit Naming Rights Proposal
            </p>
            <h3 className="mt-3 text-2xl font-bold sm:text-3xl">Prepared For</h3>
            <p className="mt-1 text-xl text-primary">{companyName}</p>
            {slogan ? <p className="mt-2 text-sm italic text-muted-foreground">&ldquo;{slogan}&rdquo;</p> : null}
            <p className="mt-2 text-sm text-muted-foreground">{industry}</p>
          </div>
          <SponsorBrandLogo theme={theme} logoUrl={logoUrl} size="lg" />
        </div>
      </div>

      <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2">
        <dl className="space-y-4">
          {[
            { label: "Venue", value: arenaName },
            { label: "State", value: state },
            { label: "Tier", value: tierName },
            { label: "Investment", value: formatCurrency(totalInvestment) },
            { label: "Investment range", value: investmentRange },
            { label: "Reach", value: `${formatCompact(estimatedReach)} / month` },
            { label: "Brand exposure", value: brandExposure },
            { label: "Timeline", value: `${contractYears}-year term · 90-day launch` },
          ].map((row) => (
            <div key={row.label} className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="max-w-[55%] text-right font-semibold">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-6">
          {PROPOSAL_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="font-semibold">{section.title}</p>
              <ul className="mt-2 space-y-1.5">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-amber-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
