import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile } from "@/lib/auth/guards";
import { getUserMarketplaceBookings } from "@/lib/data/marketplace";
import { creatorCategoryLabel } from "@/lib/constants/creator-marketplace";
import { formatCents } from "@/lib/format";

export const metadata: Metadata = { title: "Marketplace bookings" };

export default async function MarketplaceBookingsPage() {
  const { user } = await requireUserProfile();
  const bookings = await getUserMarketplaceBookings(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Marketplace bookings</h1>
      <p className="mt-2 text-sm text-muted-foreground">Hire creators or manage incoming work.</p>
      <ul className="mt-8 divide-y divide-white/10 rounded-xl border border-white/10">
        {bookings.length === 0 ? (
          <li className="px-4 py-6 text-sm text-muted-foreground">
            No bookings yet.{" "}
            <Link href="/marketplace" className="text-primary hover:underline">
              Browse creators
            </Link>
          </li>
        ) : (
          bookings.map((b) => (
            <li key={b.id}>
              <Link
                href={`/marketplace/bookings/${b.id}`}
                className="flex flex-col gap-1 px-4 py-4 hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{b.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {creatorCategoryLabel(b.serviceCategory)} · {b.role === "artist" ? "You hired" : "You were hired by"}{" "}
                    {b.counterpartyName}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="capitalize">{b.status.replace(/_/g, " ")}</span>
                  {b.agreedPriceCents ? <> · {formatCents(b.agreedPriceCents, b.currency)}</> : null}
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
