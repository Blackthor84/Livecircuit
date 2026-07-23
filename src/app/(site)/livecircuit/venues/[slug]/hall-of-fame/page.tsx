import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VenueHallOfFameDisplay } from "@/components/venues/venue-hall-of-fame-display";
import { getVenueHallOfFameReport } from "@/lib/data/venue-hof";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const report = await getVenueHallOfFameReport(slug);
  return { title: report ? `Hall of Fame · ${report.venueName}` : "Hall of Fame" };
}

export default async function VenueHallOfFamePage({ params }: Props) {
  const { slug } = await params;
  const report = await getVenueHallOfFameReport(slug);
  if (!report) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <VenueHallOfFameDisplay report={report} />
    </div>
  );
}
