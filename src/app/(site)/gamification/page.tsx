import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GamificationHub } from "@/components/gamification/gamification-hub";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getGamificationReport } from "@/lib/data/gamification";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Gamification · LiveCircuit",
  description: "Daily quests, weekly challenges, monthly goals, XP, levels, and titles.",
};

export default async function GamificationPage() {
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=${ROUTES.gamification}`);

  const report = await getGamificationReport(user.id);
  if (!report) redirect("/register");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href={ROUTES.dashboard} className="text-sm text-muted-foreground hover:text-foreground">
        ← Your dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gamification</h1>
          <p className="mt-2 text-muted-foreground">
            Quests, XP, levels, prestige titles, and the global leaderboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" href={ROUTES.achievements}>
            Achievements
          </Button>
          <Button variant="outline" href={ROUTES.coins}>
            Coins
          </Button>
        </div>
      </div>
      <div className="mt-8">
        <GamificationHub report={report} />
      </div>
    </div>
  );
}
