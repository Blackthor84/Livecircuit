import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminEntityTable } from "@/components/admin/command-center/admin-entity-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAdminGenres } from "@/lib/data/admin-entities";

export const metadata: Metadata = { title: "Genres — Admin" };

export default async function AdminGenresPage() {
  const genres = await listAdminGenres();

  return (
    <>
      <AdminPageHeader title="Genres" subtitle="Genre taxonomy used for discovery and audience segmentation." />
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Genres ({genres.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEntityTable
            rows={genres}
            emptyMessage="No genres found."
            columns={[
              { key: "name", header: "Name", cell: (row) => row.name },
              { key: "slug", header: "Slug", cell: (row) => row.slug },
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}
