import Link from "next/link";
import { AwardsCountdown } from "@/components/awards/awards-countdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/constants";
import type { AwardsHubReport } from "@/lib/types/awards";

export function AwardsHub({ report }: { report: AwardsHubReport }) {
  const featured = report.featured;

  return (
    <div className="space-y-10">
      {featured ? (
        <div className="space-y-6">
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{featured.title}</CardTitle>
                  {featured.tagline ? (
                    <p className="mt-2 text-muted-foreground">{featured.tagline}</p>
                  ) : null}
                  <Badge variant="secondary" className="mt-3 capitalize">
                    {featured.status}
                  </Badge>
                </div>
                <Button href={`${ROUTES.awards}/${featured.slug}`}>Nominees & voting</Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {featured.categories.filter((c) => c.nominees.length > 0).length} categories ·{" "}
                {featured.categories.reduce((s, c) => s + c.nominees.length, 0)} nominees
              </p>
            </CardContent>
          </Card>
          <AwardsCountdown
            status={featured.status}
            votingEndsAt={featured.votingEndsAt}
            ceremonyAt={featured.ceremonyAt}
          />
        </div>
      ) : (
        <p className="text-muted-foreground">No active ceremony yet.</p>
      )}

      {report.archive.length > 0 ? (
        <section>
          <h2 className="text-xl font-semibold">Historical archive</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {report.archive.map((c) => (
              <li key={c.id}>
                <Card className="glass-panel border-white/10">
                  <CardHeader>
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{c.tagline}</p>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm" variant="outline" href={`${ROUTES.awards}/${c.slug}`}>
                      View winners
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          <Link href={`${ROUTES.awards}/archive`} className="mt-4 inline-block text-sm text-primary hover:underline">
            Full archive →
          </Link>
        </section>
      ) : null}
    </div>
  );
}
