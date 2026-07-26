import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminEntityTable } from "@/components/admin/command-center/admin-entity-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAdminArtists } from "@/lib/data/admin-entities";

export const metadata: Metadata = { title: "Artists — Admin" };

export default async function AdminArtistsPage() {
  const artists = await listAdminArtists(100);

  return (
    <>
      <AdminPageHeader title="Artists" subtitle="Artist roster, verification status, and audience reach." />
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Artists ({artists.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEntityTable
            rows={artists}
            emptyMessage="No artists found."
            columns={[
              {
                key: "name",
                header: "Artist",
                cell: (row) => (
                  <Link href={`/artists/${row.slug}`} className="font-medium hover:text-primary">
                    {row.stage_name}
                  </Link>
                ),
              },
              {
                key: "verified",
                header: "Verified",
                cell: (row) => (row.verified ? "Yes" : "No"),
              },
              {
                key: "featured",
                header: "Featured",
                cell: (row) => (row.featured ? "Yes" : "No"),
              },
              {
                key: "followers",
                header: "Followers",
                cell: (row) => row.follower_count?.toLocaleString() ?? "0",
                className: "tabular-nums",
              },
              {
                key: "listeners",
                header: "Monthly listeners",
                cell: (row) => row.monthly_listeners?.toLocaleString() ?? "0",
                className: "tabular-nums",
              },
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}
