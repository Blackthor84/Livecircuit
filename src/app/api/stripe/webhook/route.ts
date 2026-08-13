import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { processStripeWebhookEvent } from "@/lib/monetization/stripe-webhook.service";
import { verifyStripeWebhookPayload } from "@/lib/stripe/webhook-verify";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  const verification = verifyStripeWebhookPayload(stripe, body, signature);

  if (!verification.ok) {
    if (verification.reason === "missing_secrets") {
      return NextResponse.json({ error: "Webhook verification is not configured" }, { status: 503 });
    }
    if (verification.reason === "invalid_payload") {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const result = await processStripeWebhookEvent(supabase, stripe, verification.event);
    return NextResponse.json({
      received: true,
      verifiedScope: verification.verifiedScope,
      ...result,
    });
  } catch (error) {
    console.error("[stripe-webhook]", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
