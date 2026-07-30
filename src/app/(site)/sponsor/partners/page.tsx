import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FoundingPartnerApplicationForm,
  FoundingPartnerBadge,
} from "@/components/sponsorship/founding-partner-program";
import {
  getFoundingPartnerProgramStats,
  listFoundingPartnersPublic,
} from "@/lib/sponsorship/founding-partners";
import { FOUNDING_PARTNER_BENEFITS } from "@/lib/sponsorship/program-constants";

export const metadata: Metadata = {
  title: "LiveCircuit Partners",
  description: "Founding Partners and premium sponsorship partners on LiveCircuit.",
};

export default async function PartnersPage() {
  const [stats, partners] = await Promise.all([
    getFoundingPartnerProgramStats(),
    listFoundingPartnersPublic(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">Premium partnerships</p>
        <h1 className="mt-2 text-4xl font-bold">LiveCircuit Partners</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Exclusive sponsorship inventory — intentionally limited, permanently prestigious. The platform experience stays clean; partner recognition stays premium.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/sponsor/marketplace">Browse inventory</Button>
          <Button variant="secondary" href="/sponsor/map">Live sponsor map</Button>
        </div>
      </header>

      <section className="mt-14 glass-panel rounded-2xl border border-amber-500/25 bg-amber-500/5 p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <FoundingPartnerBadge className="mb-3" />
            <h2 className="text-2xl font-bold">Founding Partner Program</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              A limited opportunity during LiveCircuit&apos;s early years. Founding Partners receive permanent recognition and preferred access to premium inventory.
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-primary">{stats.remainingSlots}</p>
            <p className="text-sm text-muted-foreground">slots remaining of {stats.maxSlots}</p>
          </div>
        </div>
        <ul className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {FOUNDING_PARTNER_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="text-primary">·</span> {b}
            </li>
          ))}
        </ul>
        {stats.remainingSlots > 0 && stats.programActive ? (
          <div className="mt-8 max-w-md">
            <h3 className="font-semibold">Apply</h3>
            <div className="mt-3">
              <FoundingPartnerApplicationForm />
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">Founding Partner slots are full — explore marketplace inventory or join waiting lists.</p>
        )}
      </section>

      {partners.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-xl font-semibold">Founding Partners</h2>
          <p className="mt-1 text-sm text-muted-foreground">Permanent recognition for early platform partners.</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((p) => (
              <li key={p.id} className="glass-panel rounded-xl border border-white/10 p-5">
                <FoundingPartnerBadge />
                <p className="mt-3 font-semibold">{p.displayName}</p>
                <p className="text-xs text-muted-foreground">Partner since {p.approvedAt.slice(0, 10)}</p>
                {p.websiteUrl ? (
                  <Link href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">
                    Visit website
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
