import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AchievementsHub } from "@/components/achievements/achievements-hub";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getAchievementsReport } from "@/lib/data/achievements";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Achievements · LiveCircuit",
  description: "Track attendance, VIP, friends, reviews, festivals, venues, and more.",
};

export default async function AchievementsPage() {
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=${ROUTES.achievements}`);

  const report = await getAchievementsReport(user.id);
  if (!report) redirect("/register");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href={ROUTES.dashboard} className="text-sm text-muted-foreground hover:text-foreground">
        ← Your dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Achievements</h1>
          <p className="mt-2 text-muted-foreground">
            Hundreds of milestones across the LiveCircuit universe — synced from your activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" href={ROUTES.passport}>
            Fan Passport
          </Button>
          <Button variant="outline" href={ROUTES.coins}>
            Coins
          </Button>
        </div>
      </div>
      <div className="mt-8">
        <AchievementsHub report={report} />
      </div>
    </div>
  );
}
