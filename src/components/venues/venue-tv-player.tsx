"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Radio, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { venueTvProgramLabel } from "@/lib/constants/venue-tv";
import { recordVenueTvViewAction } from "@/lib/actions/venue-tv";
import type { VenueTvReport } from "@/lib/types/venue-tv";

function ProgramMedia({ program }: { program: VenueTvReport["nowPlaying"] }) {
  if (!program) {
    return (
      <div className="flex aspect-video items-center justify-center bg-black/80 text-sm text-muted-foreground">
        Off air
      </div>
    );
  }

  const thumb = program.thumbnailUrl ?? program.mediaUrl;
  if (program.mediaUrl && /youtube\.com|youtu\.be/.test(program.mediaUrl)) {
    const id = program.mediaUrl.includes("youtu.be")
      ? program.mediaUrl.split("/").pop()
      : new URL(program.mediaUrl).searchParams.get("v");
    if (id) {
      return (
        <iframe
          title={program.title}
          className="aspect-video w-full"
          src={`https://www.youtube.com/embed/${id}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
  }

  return (
    <div
      className="aspect-video w-full bg-cover bg-center"
      style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
    >
      {!thumb ? (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/30 to-background text-white/80">
          <Tv className="h-16 w-16" />
        </div>
      ) : null}
    </div>
  );
}

export function VenueTvPlayer({ report }: { report: VenueTvReport }) {
  const now = report.nowPlaying;

  useEffect(() => {
    if (now?.id) void recordVenueTvViewAction({ programId: now.id });
  }, [now?.id]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/livecircuit/venues/${report.venueSlug}`} className="text-sm text-primary hover:underline">
            ← {report.venueName}
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
            <Tv className="h-6 w-6 text-primary" />
            {report.channelTitle}
          </h1>
          <p className="text-sm text-muted-foreground">{report.tagline}</p>
        </div>
        {report.isOnAir ? (
          <Badge className="gap-1 bg-red-600/90">
            <Radio className="h-3 w-3" />
            On air
          </Badge>
        ) : (
          <Badge variant="secondary">Off air</Badge>
        )}
      </div>

      <div className="glass-panel overflow-hidden rounded-xl border border-white/10">
        <ProgramMedia program={now} />
        {now ? (
          <div className="p-4">
            <Badge variant="outline">{venueTvProgramLabel(now.programType)}</Badge>
            <p className="mt-2 text-lg font-semibold">{now.title}</p>
            <p className="text-sm text-muted-foreground">{now.summary}</p>
            {now.linkHref ? (
              <Button size="sm" className="mt-3" href={now.linkHref}>
                Open related page
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {report.upNext.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Up next</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {report.upNext.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 rounded-lg border border-white/10 px-3 py-2">
                <span>{p.title}</span>
                <span className="text-muted-foreground">{venueTvProgramLabel(p.programType)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Program guide</h2>
        <div className="mt-4 space-y-6">
          {Object.entries(report.byType)
            .filter(([, items]) => items.length > 0)
            .map(([type, items]) => (
              <div key={type}>
                <h3 className="text-sm font-medium text-muted-foreground">{venueTvProgramLabel(type)}</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {items.map((p) => (
                    <li key={p.id} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                      <p className="font-medium">{p.title}</p>
                      <p className="line-clamp-2 text-muted-foreground">{p.summary}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
