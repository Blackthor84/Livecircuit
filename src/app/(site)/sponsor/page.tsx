import type { Metadata } from "next";
import Link from "next/link";
import { FoundingSponsorShowcase } from "@/components/sponsor/founding-sponsor-showcase";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { listFoundingSponsorOpportunities } from "@/lib/data/sponsors";

export const metadata: Metadata = {
  title: "Partners & Sponsorship",
  description: "Advertise on LiveCircuit venues, homepage, concourses, and live events.",
};

export default async function SponsorLandingPage() {
  const [opportunities, user] = await Promise.all([
    listFoundingSponsorOpportunities(),
    getSessionUser(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">LiveCircuit Partners</p>
        <h1 className="mt-2 text-4xl font-bold">Sponsorship platform</h1>
        <p className="mt-4 text-muted-foreground">
          Naming rights, digital billboards, homepage takeovers, concourse booths, VIP lounges, and
          category packages across our virtual venue network.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/sponsor/partners">Founding Partner Program</Button>
          <Button href="/sponsor/marketplace">Browse marketplace</Button>
          <Button variant="secondary" href="/sponsor/map">Live sponsor map</Button>
          {user ? (
            <Button variant="secondary" href="/sponsor/dashboard">Sponsor dashboard</Button>
          ) : (
            <Button variant="secondary" href="/login?redirect=/sponsor/dashboard">Sign in to manage campaigns</Button>
          )}
          <Button variant="outline" href="/livecircuit/venues">Browse venues</Button>
        </div>
      </header>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          "Venue naming & Founding Sponsor",
          "Homepage & platform billboards",
          "Concourse & kiosk placements",
          "Pre-show & VIP lounge",
          "Merch & exclusive promotions",
          "Coupon & promotion campaigns",
        ].map((item) => (
          <div key={item} className="glass-panel rounded-xl p-5 text-sm font-medium">
            {item}
          </div>
        ))}
      </div>

      <div className="mt-16">
        <FoundingSponsorShowcase venues={opportunities} />
      </div>

      <p className="mt-12 text-center text-sm text-muted-foreground">
        Enterprise contracts are configured by{" "}
        <Link href="/admin/sponsors" className="text-primary hover:underline">
          LiveCircuit admin
        </Link>{" "}
        — your dashboard activates once you&apos;re added to a sponsor organization.
      </p>
    </div>
  );
}
