import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { processStripeWebhookEvent } from "@/lib/monetization/stripe-webhook.service";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const result = await processStripeWebhookEvent(supabase, stripe, event);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("[stripe-webhook]", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
