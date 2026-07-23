import Link from "next/link";
import { Sparkles, Star } from "lucide-react";
import { WalkOfFameStarField } from "@/components/walk-of-fame/walk-of-fame-star-field";
import { ROUTES } from "@/lib/constants";
import type { WalkOfFameHubReport } from "@/lib/types/walk-of-fame";

export function WalkOfFameHubDisplay({ report }: { report: WalkOfFameHubReport }) {
  return (
    <div className="space-y-10">
      <div className="glass-panel rounded-xl p-6 text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-bold">
          <Sparkles className="h-8 w-8 text-amber-400" />
          Digital Walk of Fame
        </h1>
        <p className="mt-2 text-muted-foreground">
          Permanent stars for attendance, revenue, legacy, community, fan votes, awards, and venue contributions.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {report.totalStars} stars honoring {report.artists.length} artist
          {report.artists.length === 1 ? "" : "s"}
        </p>
        <Link href={ROUTES.discover} className="mt-3 inline-block text-sm text-primary hover:underline">
          Discover artists →
        </Link>
      </div>

      {report.artists.length === 0 ? (
        <p className="text-center text-muted-foreground">
          Stars light up as artists sell tickets, grow their community, and earn fan votes.
        </p>
      ) : (
        <ul className="space-y-6">
          {report.artists.map((entry) => (
            <li key={entry.artistId}>
              <WalkOfFameStarField entry={entry} />
            </li>
          ))}
        </ul>
      )}

      <div className="glass-panel rounded-lg p-4 text-center text-sm text-muted-foreground">
        <Star className="mx-auto mb-2 h-5 w-5 text-amber-400" />
        Tap a glowing star to read why it was earned.
      </div>
    </div>
  );
}
