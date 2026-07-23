import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getUserSponsorOrganizations } from "@/lib/data/sponsors";

export const metadata: Metadata = { title: "Sponsor dashboard" };

export default async function SponsorDashboardIndexPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/sponsor/dashboard");

  const orgs = await getUserSponsorOrganizations(user.id);

  if (orgs.length === 1) {
    redirect(`/sponsor/dashboard/${orgs[0].id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/sponsor" className="text-sm text-muted-foreground hover:text-foreground">
        ← Partners
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Your organizations</h1>
      {!orgs.length ? (
        <div className="glass-panel mt-8 rounded-xl p-8 text-center">
          <p className="text-muted-foreground">
            You are not linked to a sponsor organization yet. Ask your LiveCircuit rep or admin to add
            your user ID.
          </p>
          <Button className="mt-4" variant="secondary" href="/sponsor">
            View partnership options
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                href={`/sponsor/dashboard/${org.id}`}
                className="glass-panel block rounded-xl p-4 transition hover:border-primary/40"
              >
                <p className="font-medium">{org.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{org.role}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
