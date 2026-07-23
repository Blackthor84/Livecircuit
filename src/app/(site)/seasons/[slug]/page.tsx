import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SeasonDetailDashboard } from "@/components/seasons/season-detail-dashboard";
import { getSessionUser } from "@/lib/auth/session";
import { getSeasonDetailReport } from "@/lib/data/seasons";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const season = await getSeasonDetailReport(slug, null);
  return { title: season ? `${season.name} · Seasons` : "Season" };
}

export default async function SeasonDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await getSessionUser();
  const season = await getSeasonDetailReport(slug, user?.id ?? null);
  if (!season) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/seasons" className="text-sm text-muted-foreground hover:text-foreground">
        ← All seasons
      </Link>
      <div className="mt-8">
        <SeasonDetailDashboard season={season} signedIn={Boolean(user)} />
      </div>
    </div>
  );
}
