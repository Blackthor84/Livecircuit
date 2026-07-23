import type { Metadata } from "next";
import Link from "next/link";
import { AdminVenueListPanel } from "@/components/admin/venue-admin-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoles } from "@/lib/auth/guards";
import { listVenuesForAdmin } from "@/lib/data/venues";

export const metadata: Metadata = { title: "Venues — Admin" };

export default async function AdminVenuesPage() {
  await requireRoles(["admin"], "/");

  const venues = await listVenuesForAdmin();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            ← Admin
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Virtual venues</h1>
          <p className="mt-2 text-muted-foreground">
            Manage regional arenas, sponsorships, concourse, and seasonal themes.
          </p>
        </div>
        <Button href="/admin/venues/new">New venue</Button>
      </div>
      <Card className="glass-panel mt-8 border-white/10">
        <CardHeader>
          <CardTitle>Venue network ({venues.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminVenueListPanel items={venues} />
        </CardContent>
      </Card>
    </div>
  );
}
