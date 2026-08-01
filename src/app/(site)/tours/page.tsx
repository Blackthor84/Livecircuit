import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { getPublishedTours } from "@/lib/data/queries";
import { DIGITAL_TOURING_BRAND } from "@/lib/home/digital-touring-content";

export const metadata: Metadata = {
  title: "Digital Tours",
  description:
    "Explore live and upcoming digital tours on LiveCircuit — multi-city routes with real cities, real arenas, and real audiences.",
};

export default async function ToursPage() {
  const tours = await getPublishedTours(20);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">{DIGITAL_TOURING_BRAND.secondaryCta}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Follow digital tours from real artists. Every tour is a multi-city route — fans travel with the artist from
        stop to stop.
      </p>
      {tours.length > 0 ? (
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
      ) : (
        <div className="glass-panel mt-8 rounded-2xl border border-white/10 px-8 py-16 text-center">
          <p className="text-lg font-medium">Digital tours will appear here.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            When artists publish multi-city digital tours, they&apos;ll show up here automatically.
          </p>
          <Button className="mt-6" href={`${ROUTES.register}?role=artist`}>
            {DIGITAL_TOURING_BRAND.primaryCta}
          </Button>
        </div>
      )}
    </div>
  );
}
