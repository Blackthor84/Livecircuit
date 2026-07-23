import { NextResponse } from "next/server";
import { getAppUrl, isSupabaseConfigured } from "@/lib/config/env";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { marketplaceCheckoutSchema } from "@/lib/validations/marketplace";
import { formatCents } from "@/lib/format";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = marketplaceCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("marketplace_bookings")
    .select("id, title, artist_user_id, agreed_price_cents, currency, status")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (!booking || booking.artist_user_id !== user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "awaiting_payment") {
    return NextResponse.json({ error: "Booking is not awaiting payment" }, { status: 400 });
  }

  const amount = booking.agreed_price_cents as number;
  if (!amount || amount < 100) {
    return NextResponse.json({ error: "Invalid booking amount" }, { status: 400 });
  }

  const stripe = getStripe();
  const origin = getAppUrl();
  const currency = ((booking.currency as string) ?? "USD").toLowerCase();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: `Creator booking: ${booking.title as string}`,
            description: "LiveCircuit Creator Marketplace",
          },
        },
      },
    ],
    metadata: {
      type: "marketplace",
      booking_id: booking.id as string,
      user_id: user.id,
    },
    success_url: `${origin}/marketplace/bookings/${booking.id}?checkout=success`,
    cancel_url: `${origin}/marketplace/bookings/${booking.id}?canceled=1`,
  });

  await supabase
    .from("marketplace_bookings")
    .update({
      stripe_checkout_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  return NextResponse.json({ url: session.url, label: formatCents(amount, booking.currency as string) });
}
