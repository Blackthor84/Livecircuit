import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminEntityTable } from "@/components/admin/command-center/admin-entity-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import { listAdminTours } from "@/lib/data/admin-entities";

export const metadata: Metadata = { title: "Tours — Admin" };

export default async function AdminToursPage() {
  const tours = await listAdminTours(100);

  return (
    <>
      <AdminPageHeader title="Tours" subtitle="Multi-date tour packages and routing." />
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Tours ({tours.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEntityTable
            rows={tours}
            emptyMessage="No tours found."
            columns={[
              {
                key: "title",
                header: "Tour",
                cell: (row) => {
                  const artist = Array.isArray(row.artists) ? row.artists[0] : row.artists;
                  const href = artist?.slug
                    ? `/artists/${artist.slug}/tours/${row.slug}`
                    : ROUTES.tours;
                  return (
                    <Link href={href} className="font-medium hover:text-primary">
                      {row.title}
                    </Link>
                  );
                },
              },
              {
                key: "artist",
                header: "Artist",
                cell: (row) => {
                  const artist = Array.isArray(row.artists) ? row.artists[0] : row.artists;
                  return artist?.stage_name ?? "—";
                },
              },
              {
                key: "status",
                header: "Status",
                cell: (row) => (
                  <Badge variant="secondary" className="capitalize">
                    {row.status}
                  </Badge>
                ),
              },
              {
                key: "dates",
                header: "Dates",
                cell: (row) => {
                  const start = row.starts_at ? new Date(row.starts_at).toLocaleDateString() : "—";
                  const end = row.ends_at ? new Date(row.ends_at).toLocaleDateString() : "—";
                  return `${start} → ${end}`;
                },
              },
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}
