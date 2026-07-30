import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LiveSponsorMap } from "@/components/sponsorship/live-sponsor-map";
import { getLiveSponsorMapData } from "@/lib/sponsorship/sponsor-map";

export const metadata: Metadata = {
  title: "Live Sponsor Map",
  description: "United States sponsorship inventory by state — arenas, sold slots, revenue, and occupancy.",
};

export default async function SponsorMapPage() {
  const states = await getLiveSponsorMapData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Inventory intelligence</p>
          <h1 className="mt-2 text-3xl font-bold">Live sponsor map</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every state at a glance — arenas, sold sponsorships, available inventory, revenue, and occupancy. Click a state to explore opportunities.
          </p>
        </div>
        <Button variant="secondary" href="/sponsor/marketplace">Marketplace</Button>
      </header>

      <LiveSponsorMap states={states} />

      <p className="mt-10 text-center text-sm text-muted-foreground">
        <Link href="/sponsor/partners" className="text-primary hover:underline">Founding Partner Program</Link>
        {" · "}
        Premium inventory is exclusive — one sponsor per slot.
      </p>
    </div>
  );
}
