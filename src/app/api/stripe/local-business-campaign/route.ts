import { NextResponse } from "next/server";
import { getAppUrl, isSupabaseConfigured } from "@/lib/config/env";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { z } from "zod";

const bodySchema = z.object({ campaignId: z.string().uuid() });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid campaign" }, { status: 400 });

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("local_business_campaigns")
    .select("id, price_cents, currency, status, business_id, local_businesses(owner_user_id, slug)")
    .eq("id", parsed.data.campaignId)
    .maybeSingle();

  if (!campaign || campaign.status !== "pending_payment") {
    return NextResponse.json({ error: "Campaign not payable" }, { status: 400 });
  }

  const bizRaw = campaign.local_businesses as { owner_user_id: string; slug: string } | { owner_user_id: string; slug: string }[];
  const biz = Array.isArray(bizRaw) ? bizRaw[0] : bizRaw;
  if (!biz || biz.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const stripe = getStripe();
  const origin = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: ((campaign.currency as string) ?? "USD").toLowerCase(),
          unit_amount: campaign.price_cents as number,
          product_data: {
            name: "Local business campaign",
            description: biz.slug,
          },
        },
      },
    ],
    metadata: {
      type: "local_business_campaign",
      campaign_id: campaign.id as string,
      business_id: campaign.business_id as string,
      user_id: user.id,
    },
    success_url: `${origin}/local-business/dashboard?checkout=success`,
    cancel_url: `${origin}/local-business/dashboard?canceled=1`,
  });

  await supabase
    .from("local_business_campaigns")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", campaign.id);

  return NextResponse.json({ url: session.url });
}
