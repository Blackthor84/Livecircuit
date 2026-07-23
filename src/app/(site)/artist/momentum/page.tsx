import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArtistMomentumDashboard } from "@/components/artist/artist-momentum-dashboard";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getArtistMomentumForUser } from "@/lib/data/artist-momentum";

export const metadata: Metadata = {
  title: "Artist Momentum · LiveCircuit Score",
  description: "Your LiveCircuit Score, trend, and performance factor breakdown.",
};

export default async function ArtistMomentumPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/artist/momentum");

  const payload = await getArtistMomentumForUser(user.id);
  if (!payload) redirect("/register?role=artist");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/artist/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
        ← Artist dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Artist Momentum</h1>
          <p className="text-muted-foreground">LiveCircuit Score and factor breakdown</p>
        </div>
        <Button variant="outline" href={`/artists/${payload.artist.slug}`}>
          Public profile
        </Button>
      </div>
      <div className="mt-8">
        <ArtistMomentumDashboard report={payload.report} />
      </div>
    </div>
  );
}
