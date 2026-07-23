import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VenueTvPlayer } from "@/components/venues/venue-tv-player";
import { getVenueTvReport } from "@/lib/data/venue-tv";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const report = await getVenueTvReport(slug);
  return { title: report ? `${report.channelTitle}` : "Venue TV" };
}

export default async function VenueTvPage({ params }: Props) {
  const { slug } = await params;
  const report = await getVenueTvReport(slug);
  if (!report) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <VenueTvPlayer report={report} />
    </div>
  );
}
