import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BookingDetailPanel } from "@/components/marketplace/booking-detail-panel";
import { getSessionUser } from "@/lib/auth/session";
import { getMarketplaceBooking } from "@/lib/data/marketplace";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Booking" };
}

export default async function MarketplaceBookingPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/marketplace/bookings");

  const { id } = await params;
  const booking = await getMarketplaceBooking(id, user.id);
  if (!booking) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <BookingDetailPanel booking={booking} userId={user.id} />
    </div>
  );
}
