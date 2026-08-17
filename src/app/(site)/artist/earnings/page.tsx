import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArtistBalanceSummaryCard } from "@/components/artist/artist-balance-summary-card";
import { ArtistEarningsTransparency } from "@/components/artist/artist-earnings-transparency";
import { Button } from "@/components/ui/button";
import { requireUserProfile } from "@/lib/auth/guards";
import { isArtistOrAdminRole } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/constants";
import { getArtistForSettings } from "@/lib/data/profiles";
import { buildArtistEarningsDisplayConfig } from "@/lib/monetization/artist-earnings-display";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";
import {
  getArtistBalanceSummary,
  listArtistTicketTransactions,
} from "@/lib/services/artist-balance.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Artist earnings & payouts",
  description: "Understand how LiveCircuit calculates ticket earnings, payout eligibility, and payout timing.",
};

export default async function ArtistEarningsPage() {
  const { user, profile } = await requireUserProfile();
  if (!isArtistOrAdminRole(profile.role)) {
    redirect("/register?role=artist");
  }

  const bundle = await getArtistForSettings(user.id);
  if (!bundle) {
    redirect(ROUTES.artistDashboard);
  }

  const supabase = await createClient();
  const [snapshot, balance, transactions] = await Promise.all([
    getMonetizationSnapshot(),
    getArtistBalanceSummary(supabase, bundle.artist.id),
    listArtistTicketTransactions(supabase, bundle.artist.id),
  ]);

  const config = buildArtistEarningsDisplayConfig(snapshot);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" href={ROUTES.artistDashboard}>
            Dashboard
          </Button>
          <Button variant="outline" href="/artist/settings">
            Payment settings
          </Button>
        </div>
      </div>

      <div className="mb-10">
        <ArtistBalanceSummaryCard balance={balance} showLink={false} />
      </div>

      <ArtistEarningsTransparency config={config} balance={balance} transactions={transactions} />

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Questions about a specific transaction?{" "}
        <Link href="/contact" className="text-primary hover:underline">
          Contact support
        </Link>
      </p>
    </div>
  );
}
