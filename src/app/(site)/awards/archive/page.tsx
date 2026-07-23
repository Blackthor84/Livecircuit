import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAwardsHubReport } from "@/lib/data/awards";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Awards archive · LiveCircuit",
  description: "Past LiveCircuit Awards ceremonies and winners.",
};

export default async function AwardsArchivePage() {
  const report = await getAwardsHubReport();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href={ROUTES.awards} className="text-sm text-muted-foreground hover:text-foreground">
        ← Awards hub
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Awards archive</h1>
      <p className="mt-2 text-muted-foreground">Historical ceremonies and recorded honors.</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {report.archive.map((c) => (
          <li key={c.id}>
            <Card className="glass-panel h-full border-white/10">
              <CardHeader>
                <CardTitle>{c.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{c.tagline}</p>
              </CardHeader>
              <CardContent>
                <Button size="sm" variant="outline" href={`${ROUTES.awards}/${c.slug}`}>
                  Open archive
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {report.archive.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Archive entries appear after each ceremony concludes.</p>
      ) : null}
    </div>
  );
}
