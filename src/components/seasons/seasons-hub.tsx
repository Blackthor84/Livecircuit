import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SeasonSummary, SeasonsHubReport } from "@/lib/types/seasons";

function SeasonCard({ season }: { season: SeasonSummary }) {
  return (
    <Link href={`/seasons/${season.slug}`} className="block">
      <Card className="glass-panel h-full border-white/10 transition hover:border-primary/40">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">{season.name}</CardTitle>
            {season.tagline ? <p className="mt-1 text-sm text-muted-foreground">{season.tagline}</p> : null}
          </div>
          <span className="text-2xl" aria-hidden>
            {season.decorationIcon ?? "✨"}
          </span>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <CalendarRange className="h-3.5 w-3.5" />
            {new Date(season.startsAt).toLocaleDateString()} – {new Date(season.endsAt).toLocaleDateString()}
          </p>
          {season.themeName ? <p>Venue theme: {season.themeName}</p> : null}
          <Badge variant={season.status === "active" ? "default" : "secondary"} className="capitalize">
            {season.status}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}

function SeasonSection({ title, seasons }: { title: string; seasons: SeasonSummary[] }) {
  if (!seasons.length) return null;
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {seasons.map((s) => (
          <SeasonCard key={s.id} season={s} />
        ))}
      </div>
    </section>
  );
}

export function SeasonsHub({ report }: { report: SeasonsHubReport }) {
  return (
    <div className="space-y-12">
      <SeasonSection title="Live now" seasons={report.active} />
      <SeasonSection title="Coming soon" seasons={report.upcoming} />
      <SeasonSection title="Archive" seasons={report.archive} />
      {report.active.length === 0 && report.upcoming.length === 0 && report.archive.length === 0 ? (
        <p className="text-muted-foreground">Seasons will appear here as they are scheduled.</p>
      ) : null}
    </div>
  );
}
