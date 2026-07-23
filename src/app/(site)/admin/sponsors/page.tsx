import type { Metadata } from "next";
import Link from "next/link";
import { requireRoles } from "@/lib/auth/guards";
import { listSponsorOrganizationsAdmin } from "@/lib/data/sponsors";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sponsors — Admin" };

export default async function AdminSponsorsPage() {
  await requireRoles(["admin"], "/");

  const orgs = await listSponsorOrganizationsAdmin();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Admin
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Sponsor organizations</h1>
      <p className="mt-2 text-muted-foreground">
        Create orgs and venue contracts under venue admin. Add members by profile UUID for dashboard access.
      </p>
      <Button className="mt-6" href="/admin/venues">
        Manage venues & contracts
      </Button>
      <ul className="mt-8 space-y-3">
        {orgs.map((org) => (
          <li key={org.id as string} className="glass-panel rounded-xl p-4">
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
        {!orgs.length ? (
          <p className="text-sm text-muted-foreground">No sponsor organizations — create one on a venue admin page.</p>
        ) : null}
      </ul>
    </div>
  );
}
