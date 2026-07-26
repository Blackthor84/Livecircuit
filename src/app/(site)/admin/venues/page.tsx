import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminVenueListPanel } from "@/components/admin/venue-admin-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listVenuesForAdmin } from "@/lib/data/venues";

export const metadata: Metadata = { title: "Venues — Admin" };

export default async function AdminVenuesPage() {
  const venues = await listVenuesForAdmin();

  return (
    <>
      <AdminPageHeader title="Venues" subtitle="Manage regional arenas, sponsorships, concourse, and seasonal themes." />
      <div className="mb-6 flex justify-end">
        <Button href="/admin/venues/new">New venue</Button>
      </div>
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Venue network ({venues.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminVenueListPanel items={venues} />
        </CardContent>
      </Card>
    </>
  );
}
