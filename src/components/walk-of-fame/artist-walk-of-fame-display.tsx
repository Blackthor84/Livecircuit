import Link from "next/link";
import { WalkOfFameStarField } from "@/components/walk-of-fame/walk-of-fame-star-field";
import { ROUTES } from "@/lib/constants";
import type { ArtistWalkOfFameReport } from "@/lib/types/walk-of-fame";

export function ArtistWalkOfFameDisplay({ report }: { report: ArtistWalkOfFameReport }) {
  return (
    <div className="space-y-8">
      <div className="glass-panel rounded-xl p-6 text-center">
        <Link href={ROUTES.walkOfFame} className="text-sm text-primary hover:underline">
          ← Digital Walk of Fame
        </Link>
        <h1 className="mt-3 text-3xl font-bold">{report.stageName}</h1>
        <p className="mt-2 text-muted-foreground">
          {report.starCount} permanent star{report.starCount === 1 ? "" : "s"} on LiveCircuit.
        </p>
        <Link href={`/artists/${report.slug}`} className="mt-3 inline-block text-sm text-primary hover:underline">
          Artist profile →
        </Link>
      </div>

      <WalkOfFameStarField entry={report} showVote viewerHasVoted={report.viewerHasVoted} />
    </div>
  );
}
