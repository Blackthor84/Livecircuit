import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TourManagePanel } from "@/components/artist/tour-manage-panel";
import { requireRoles } from "@/lib/auth/guards";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { getArtistForUser, getSessionUser } from "@/lib/auth/session";
import { getTourForArtistManage } from "@/lib/data/artist-tours";
import { getVenuePickerList } from "@/lib/data/venues";
import { getCountries } from "@/lib/data/locations";
import { isSupabaseConfigured } from "@/lib/config/env";

type Props = { params: Promise<{ tourId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tourId } = await params;
  return { title: `Manage tour · ${tourId.slice(0, 8)}` };
}

export default async function ArtistTourManagePage({ params }: Props) {
  await requireRoles(["artist", ...ADMIN_ROLES], "/register?role=artist");

  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (!isSupabaseConfigured()) {
    redirect("/artist/tours/new");
  }

  const artist = await getArtistForUser(user.id);
  if (!artist) redirect("/artist/settings");

  const { tourId } = await params;
  const payload = await getTourForArtistManage(user.id, tourId);
  if (!payload) notFound();

  const countries = await getCountries();
  const venues = await getVenuePickerList();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Manage tour</h1>
      <p className="mt-2 text-muted-foreground">
        Add virtual stops, set ticket prices, then publish to create live events automatically.
      </p>
      <div className="mt-8">
        <TourManagePanel initial={payload} countries={countries} venues={venues} />
      </div>
    </div>
  );
}
