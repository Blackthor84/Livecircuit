import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import { listPublicAgencies } from "@/lib/data/agencies";
import { requireFeatureAccess } from "@/lib/features/guard";

export const metadata: Metadata = {
  title: "Agencies",
  description: "Discover verified talent agencies on LiveCircuit.",
};

export default async function PublicAgenciesPage() {
  await requireFeatureAccess("agency_portal");
  const agencies = await listPublicAgencies(24);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Agencies</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Discover agencies</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Verified talent agencies on LiveCircuit receive included venue access, Booking CRM, promotional credits,
            and exclusive partner advantages — wholesale partners, not per-booking customers.
          </p>
        </div>
        <Link href={ROUTES.agencyHome} className="text-sm text-primary hover:underline">
          Agency portal →
        </Link>
      </div>

      {agencies.length ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agencies.map((agency) => (
            <Card key={agency.id} className="glass-panel border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{agency.name}</CardTitle>
                  {agency.verified ? <Badge>Verified</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{agency.biography?.slice(0, 140) ?? "Professional talent representation on LiveCircuit."}</p>
                <p className="mt-3">{agency.roster_count} artists on roster</p>
                {agency.genres.length ? (
                  <p className="mt-1 capitalize">{agency.genres.slice(0, 3).join(" · ")}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-panel mt-10 border-white/10">
          <CardContent className="py-12 text-center text-muted-foreground">
            Verified agencies will appear here as partners join LiveCircuit.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
