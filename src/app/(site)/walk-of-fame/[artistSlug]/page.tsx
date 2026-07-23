import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtistWalkOfFameDisplay } from "@/components/walk-of-fame/artist-walk-of-fame-display";
import { getArtistWalkOfFameReport } from "@/lib/data/walk-of-fame";

type Props = { params: Promise<{ artistSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artistSlug } = await params;
  const report = await getArtistWalkOfFameReport(artistSlug);
  return {
    title: report ? `Walk of Fame · ${report.stageName}` : "Walk of Fame",
  };
}

export default async function ArtistWalkOfFamePage({ params }: Props) {
  const { artistSlug } = await params;
  const report = await getArtistWalkOfFameReport(artistSlug);
  if (!report) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <ArtistWalkOfFameDisplay report={report} />
    </div>
  );
}
