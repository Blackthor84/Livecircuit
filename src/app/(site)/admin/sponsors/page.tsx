import type { Metadata } from "next";
import { AdminCommandShell } from "@/components/admin/command-center/admin-command-shell";
import { listSponsorOrganizationsAdmin } from "@/lib/data/sponsors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sponsorships — Admin" };

export default async function AdminSponsorsPage() {
  const orgs = await listSponsorOrganizationsAdmin();

  return (
    <AdminCommandShell
      title="Sponsorships"
      subtitle="Sponsor organizations and venue contracts. Add members by profile UUID for dashboard access."
    >
      <div className="mb-6">
        <Button href="/admin/venues">Manage venues & contracts</Button>
      </div>
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Sponsor organizations ({orgs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {!orgs.length ? (
            <p className="text-sm text-muted-foreground">
              No sponsor organizations — create one on a venue admin page.
            </p>
          ) : (
            <ul className="space-y-3">
              {orgs.map((org) => (
                <li key={org.id as string} className="rounded-xl border border-white/10 p-4">
                  <p className="font-medium">{org.name as string}</p>
                  <p className="text-sm text-muted-foreground">/{org.slug as string}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    href={`/sponsor/dashboard/${org.id as string}`}
                  >
                    Open sponsor dashboard
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AdminCommandShell>
  );
}
