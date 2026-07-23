import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTourWithStops } from "@/lib/data/queries";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string; tourSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tourSlug } = await params;
  return { title: tourSlug.replace(/-/g, " ") };
}

export default async function TourPage({ params }: Props) {
  const { slug, tourSlug } = await params;
  const data = await getTourWithStops(slug, tourSlug);
  if (!data) notFound();

  const { tour, stops } = data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">{tour.title}</h1>
      <p className="mt-2 text-muted-foreground">Each stop is a ticketed live event with its own countdown.</p>
      <ol className="mt-10 space-y-4">
        {stops.map((stop, i) => (
          <li key={stop.id} className="glass-panel rounded-xl p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-primary">Stop {i + 1}</p>
                <h2 className="text-xl font-semibold">
                  {stop.cities?.name ?? stop.virtual_location_label}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {new Date(stop.scheduled_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button href={`/checkout?tourStop=${stop.id}&type=ticket`}>
                  From {formatCents(stop.ticket_price_cents)}
                </Button>
                {stop.vip_price_cents && stop.vip_price_cents > 0 ? (
                  <Button
                    variant="outline"
                    href={`/checkout?tourStop=${stop.id}&type=ticket&tier=vip`}
                  >
                    VIP {formatCents(stop.vip_price_cents)}
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
