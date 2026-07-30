import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminVenueEditor } from "@/components/admin/venue-admin-editor";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/guards";
import { getVenueAdminDetail } from "@/lib/data/venues";
import { getVenueSponsorshipInventory } from "@/lib/sponsorship/inventory";
import type { VenueInventoryRow } from "@/lib/sponsorship/inventory";

type PageProps = { params: Promise<{ venueId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { venueId } = await params;
  const detail = await getVenueAdminDetail(venueId);
  return { title: detail ? `${detail.venue.name} — Admin` : "Venue — Admin" };
}

export default async function AdminVenueDetailPage({ params }: PageProps) {
  await requireAdmin("/");

  const { venueId } = await params;
  const [detail, sponsorshipInventory] = await Promise.all([
    getVenueAdminDetail(venueId),
    getVenueSponsorshipInventory(venueId),
  ]);
  if (!detail) notFound();

  const sponsorshipRevenueCents = sponsorshipInventory.reduce(
    (sum, row) => sum + (row.contract?.contractValueCents ?? 0),
    0
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link href="/admin/venues" className="text-sm text-muted-foreground hover:text-foreground">
        ← Venues
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{detail.venue.name}</h1>
        {!detail.venue.is_active ? <Badge variant="outline">Inactive</Badge> : null}
      </div>
      <p className="mt-2 text-muted-foreground">
        /livecircuit/venues/{detail.venue.slug} · Internal ID{" "}
        <code className="text-xs">{detail.venue.id}</code>
      </p>
      <AdminVenueEditor
        data={detail}
        sponsorshipInventory={sponsorshipInventory as VenueInventoryRow[]}
        sponsorshipRevenueCents={sponsorshipRevenueCents}
      />
    </div>
  );
}
