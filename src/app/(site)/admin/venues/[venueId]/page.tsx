import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminVenueEditor } from "@/components/admin/venue-admin-editor";
import { Badge } from "@/components/ui/badge";
import { requireRoles } from "@/lib/auth/guards";
import { getVenueAdminDetail } from "@/lib/data/venues";

type PageProps = { params: Promise<{ venueId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { venueId } = await params;
  const detail = await getVenueAdminDetail(venueId);
  return { title: detail ? `${detail.venue.name} — Admin` : "Venue — Admin" };
}

export default async function AdminVenueDetailPage({ params }: PageProps) {
  await requireRoles(["admin"], "/");

  const { venueId } = await params;
  const detail = await getVenueAdminDetail(venueId);
  if (!detail) notFound();

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
        /livecircuit/venues/{detail.venue.slug} · API{" "}
        <code className="text-xs">/api/venues/{detail.venue.slug}</code>
      </p>
      <AdminVenueEditor data={detail} />
    </div>
  );
}
