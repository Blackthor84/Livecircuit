import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getUserSponsorOrganizations } from "@/lib/data/sponsors";
import { browseSponsorshipMarketplace, listMarketplaceStates } from "@/lib/sponsorship/marketplace";
import { SponsorshipMarketplacePanel } from "@/components/sponsorship/sponsorship-marketplace-panel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sponsorship Marketplace",
  description: "Browse exclusive premium sponsorship inventory across LiveCircuit venues.",
};

export default async function SponsorshipMarketplacePage() {
  const user = await getSessionUser();
  const [listings, states, orgs] = await Promise.all([
    browseSponsorshipMarketplace(),
    listMarketplaceStates(),
    user ? getUserSponsorOrganizations(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Premium inventory</p>
          <h1 className="mt-2 text-3xl font-bold">Sponsorship marketplace</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Browse exclusive sponsorship slots by state, arena, audience size, and price. One sponsor per slot — scarcity drives value.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user ? (
            <Button href="/sponsor/dashboard">Sponsor dashboard</Button>
          ) : (
            <Button href="/login?redirect=/sponsor/marketplace">Sign in</Button>
          )}
          <Button variant="outline" href="/sponsor">Partners overview</Button>
        </div>
      </header>

      <SponsorshipMarketplacePanel
        listings={listings}
        states={states}
        organizations={orgs.map((o) => ({ id: o.id, name: o.name }))}
      />

      <p className="mt-12 text-center text-sm text-muted-foreground">
        Enterprise contracts managed by{" "}
        <Link href="/admin/sponsorships" className="text-primary hover:underline">
          LiveCircuit partnerships
        </Link>
      </p>
    </div>
  );
}
