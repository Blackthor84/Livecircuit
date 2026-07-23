import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FestivalDetailDashboard } from "@/components/festivals/festival-detail-dashboard";
import { getSessionUser } from "@/lib/auth/session";
import { getFestivalDetailReport } from "@/lib/data/virtual-festivals";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fest = await getFestivalDetailReport(slug, null);
  return { title: fest ? `${fest.name} · Festivals` : "Festival" };
}

export default async function FestivalDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await getSessionUser();
  const festival = await getFestivalDetailReport(slug, user?.id ?? null);
  if (!festival) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/festivals" className="text-sm text-muted-foreground hover:text-foreground">
        ← All festivals
      </Link>
      <div className="mt-8">
        <FestivalDetailDashboard festival={festival} signedIn={Boolean(user)} />
      </div>
    </div>
  );
}
