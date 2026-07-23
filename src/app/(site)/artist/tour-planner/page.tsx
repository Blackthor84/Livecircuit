import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TourPlannerDashboard } from "@/components/artist/tour-planner-dashboard";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getArtistTourPlannerReport } from "@/lib/data/tour-planner";

export const metadata: Metadata = {
  title: "AI Tour Planner · Artist",
  description: "Optimize your virtual tour from fan heat, sales, and engagement data.",
};

export default async function ArtistTourPlannerPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/artist/tour-planner");

  const payload = await getArtistTourPlannerReport(user.id);
  if (!payload) redirect("/register?role=artist");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/artist/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
        ← Artist dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">AI Tour Planner</h1>
        <Button variant="outline" href={`/artists/${payload.artist.slug}`}>
          Public profile
        </Button>
      </div>
      <div className="mt-8">
        <TourPlannerDashboard
          initialPlan={payload.plan}
          artistId={payload.artist.id}
          artistSlug={payload.artist.slug}
        />
      </div>
    </div>
  );
}
