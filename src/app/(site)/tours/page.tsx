import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedTours } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Tours" };

export default async function ToursPage() {
  const tours = await getPublishedTours(20);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Virtual tours</h1>
      <div className="mt-8 space-y-4">
        {tours.map((tour) => (
          <Link
            key={tour.id}
            href={`/artists/${tour.artists?.slug}/tours/${tour.slug}`}
            className="glass-panel block rounded-xl p-6 hover:border-primary/30"
          >
            <p className="text-sm text-muted-foreground">{tour.artists?.stage_name}</p>
            <p className="text-xl font-semibold">{tour.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
