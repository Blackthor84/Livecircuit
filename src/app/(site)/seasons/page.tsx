import type { Metadata } from "next";
import Link from "next/link";
import { SeasonsHub } from "@/components/seasons/seasons-hub";
import { Button } from "@/components/ui/button";
import { getSeasonsHubReport } from "@/lib/data/seasons";

export const metadata: Metadata = {
  title: "Seasons · LiveCircuit",
  description: "Seasonal tours, leaderboards, badges, limited merch, and venue themes.",
};

export default async function SeasonsPage() {
  const report = await getSeasonsHubReport();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Seasons</h1>
          <p className="mt-2 text-muted-foreground">
            Limited-time circuits with leaderboards, badges, merch drops, and decorated venues.
          </p>
        </div>
        <Button variant="outline" href="/discover">
          Find shows
        </Button>
      </div>
      <div className="mt-10">
        <SeasonsHub report={report} />
      </div>
      {report.archive.length > 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          Browse past seasons from each card in the archive section, or{" "}
          <Link href="/seasons/archive" className="text-primary hover:underline">
            view archive index
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
