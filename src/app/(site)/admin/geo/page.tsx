import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminEntityTable } from "@/components/admin/command-center/admin-entity-table";
import { CountryEnableToggle } from "@/components/admin/country-enable-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAdminCountries } from "@/lib/data/locations";

export const metadata: Metadata = { title: "Global Regions — Admin" };

export default async function AdminGeoPage() {
  const countries = await listAdminCountries();
  const enabledCount = countries.filter((c) => c.is_enabled).length;

  return (
    <>
      <AdminPageHeader
        title="Global touring regions"
        subtitle="Enable countries for artist tour routes. Launch markets: US, Canada, UK, Australia, New Zealand."
      />
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>
            Countries ({enabledCount} enabled / {countries.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEntityTable
            rows={countries}
            emptyMessage="No countries found."
            columns={[
              { key: "name", header: "Country", cell: (row) => row.name },
              { key: "code", header: "Code", cell: (row) => row.code },
              {
                key: "status",
                header: "Status",
                cell: (row) => (
                  <Badge variant={row.is_enabled ? "default" : "secondary"}>
                    {row.is_enabled ? "Live" : "Coming soon"}
                  </Badge>
                ),
              },
              {
                key: "toggle",
                header: "Enable",
                cell: (row) => (
                  <CountryEnableToggle
                    countryId={row.id}
                    initialEnabled={row.is_enabled}
                    countryName={row.name}
                  />
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}
