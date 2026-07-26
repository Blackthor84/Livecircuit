import type { Metadata } from "next";
import Link from "next/link";
import { AdminVenueCreateForm } from "@/components/admin/venue-admin-editor";
import { requireAdmin } from "@/lib/auth/guards";
import { getVenueTypes } from "@/lib/data/venues";

export const metadata: Metadata = { title: "New venue — Admin" };

export default async function AdminNewVenuePage() {
  await requireAdmin("/");

  const venueTypes = await getVenueTypes();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link href="/admin/venues" className="text-sm text-muted-foreground hover:text-foreground">
        ← Venues
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Create venue</h1>
      <p className="mt-2 text-muted-foreground">
        New venues receive default billboards and a Founding Sponsor badge slot.
      </p>
      <AdminVenueCreateForm venueTypes={venueTypes.map((t) => ({ slug: t.slug, name: t.name }))} />
    </div>
  );
}
