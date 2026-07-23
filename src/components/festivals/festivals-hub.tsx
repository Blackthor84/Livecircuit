import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FestivalSummary, FestivalsHubReport } from "@/lib/types/virtual-festivals";

function FestivalCard({ festival }: { festival: FestivalSummary }) {
  return (
    <Link href={`/festivals/${festival.slug}`}>
      <Card className="glass-panel h-full border-white/10 transition hover:border-primary/40">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">{festival.name}</CardTitle>
            {festival.tagline ? (
              <p className="mt-1 text-sm text-muted-foreground">{festival.tagline}</p>
            ) : null}
          </div>
          <span className="text-2xl" aria-hidden>
            {festival.bannerIcon ?? "🎪"}
          </span>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(festival.startsAt).toLocaleDateString()} – {new Date(festival.endsAt).toLocaleDateString()}
          </p>
          <p>{festival.venueCount} venues · simultaneous stages</p>
          <Badge variant={festival.status === "live" ? "default" : "secondary"} className="capitalize">
            {festival.status}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}

function Section({ title, items }: { title: string; items: FestivalSummary[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((f) => (
          <FestivalCard key={f.id} festival={f} />
        ))}
      </div>
    </section>
  );
}

export function FestivalsHub({ report }: { report: FestivalsHubReport }) {
  return (
    <div className="space-y-12">
      <Section title="Live festivals" items={report.live} />
      <Section title="Upcoming" items={report.upcoming} />
      <Section title="Past festivals" items={report.past} />
    </div>
  );
}
