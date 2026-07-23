import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VenueCollectionDashboard } from "@/components/fan/venue-collection-dashboard";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getVenueCollectionReport } from "@/lib/data/venue-collection";

export const metadata: Metadata = {
  title: "Venue Collection · LiveCircuit",
  description: "Collect venues, track regions, and earn venue badges.",
};

export default async function VenueCollectionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/collections/venues");

  const report = await getVenueCollectionReport(user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
        ← Your dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">Venue collection</h1>
        <Button variant="outline" href="/livecircuit/venues">
          Browse venues
        </Button>
      </div>
      <div className="mt-8">
        <VenueCollectionDashboard report={report} />
      </div>
    </div>
  );
}
