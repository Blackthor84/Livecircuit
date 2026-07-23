import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VenueLoyaltyPanel } from "@/components/venues/venue-loyalty-panel";
import { VenueThemeShell } from "@/components/venues/venue-theme-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getVenueLoyaltyPage } from "@/lib/data/venue-loyalty";
import { getActiveVenueTheme } from "@/lib/data/venue-themes";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getVenueLoyaltyPage(slug);
  if (!data) return { title: "Loyalty" };
  return { title: `${data.venue.name} loyalty · LiveCircuit` };
}

export default async function VenueLoyaltyPage({ params }: Props) {
  const { slug } = await params;
  const user = await getSessionUser();
  const [data, theme] = await Promise.all([
    getVenueLoyaltyPage(slug, user?.id),
    getActiveVenueTheme(slug),
  ]);
  if (!data) notFound();

  return (
    <VenueThemeShell theme={theme} venueSlug={slug}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={`/livecircuit/venues/${slug}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {data.venue.name}
      </Link>
      <div className="mt-6">
        <VenueLoyaltyPanel data={data} userSignedIn={Boolean(user)} />
      </div>
      </div>
    </VenueThemeShell>
  );
}
