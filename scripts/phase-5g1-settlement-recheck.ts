/**
 * Phase 5G.1 — READ-ONLY Stripe Connect settlement recheck for LIFE payout.
 * Run: npx tsx scripts/phase-5g1-settlement-recheck.ts
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const CONNECT = "acct_1U3xwlEJwfCXyXc7";
const ARTIST_ID = "91b8850b-c145-4fa1-9167-0ba83cd329e8";
const LIFE_ORDER = "2d9d1586-10f9-4255-a47b-d962962d343b";
const GOLDEN = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const HIST_DISP = "56d3952c-43bc-4457-9a4d-e7a50deaec50";
const FRESH_DISP = "0d4e711f-970f-494d-bd54-56f18c3dbda5";
const HIST_DISPUTE = "du_1U5FPtEJwfqaexCo2K4kMbhl";
const FRESH_DISPUTE = "du_1U5GTmEJwfqaexConl1T4Yhc";

function loadStripeKey() {
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) return process.env.STRIPE_SECRET_KEY;
  const toml = readFileSync(join(homedir(), ".config", "stripe", "config.toml"), "utf8");
  const key = toml.match(/test_mode_api_key\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (!key?.startsWith("sk_test_")) throw new Error("TEST Stripe key required");
  return key;
}

function loadServiceKey() {
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", {
    encoding: "utf8",
  });
  const key = JSON.parse(raw).keys.find((k: { name: string }) => k.name === "service_role").api_key;
  return { url: "https://lblhjnzphvthnxulugep.supabase.co", key };
}

type Classification = "READY_FOR_PAYOUT" | "STRIPE_SETTLEMENT_BLOCKED" | "MINIMUM_PAYOUT_BLOCKED" | "BOTH_BLOCKED";

async function main() {
  const sk = loadStripeKey();
  const creds = loadServiceKey();
  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  const balance = await stripe.balance.retrieve({}, { stripeAccount: CONNECT });
  const stripeAvailable = balance.available.find((b) => b.currency === "usd")?.amount ?? 0;
  const stripePending = balance.pending.find((b) => b.currency === "usd")?.amount ?? 0;
  const stripeInstant =
    balance.instant_available?.find((b) => b.currency === "usd")?.amount ?? null;

  const { data: lcBalance } = await admin
    .from("artist_balances")
    .select("pending_cents, available_cents, lifetime_paid_out_cents")
    .eq("artist_id", ARTIST_ID)
    .maybeSingle();

  const { data: lifeOrder } = await admin.from("orders").select("*").eq("id", LIFE_ORDER).single();

  const { data: payoutConfig } = await admin
    .from("monetization_payout_config")
    .select("payout_delay_days, min_payout_cents, reserve_percent, stripe_connect_ready")
    .eq("id", "default")
    .single();

  const { data: availableOrders } = await admin
    .from("orders")
    .select("id, remaining_artist_earnings_cents, artist_earnings_cents")
    .eq("artist_id", ARTIST_ID)
    .eq("artist_payout_status", "available")
    .eq("status", "paid");

  const lcAvailable = Number(lcBalance?.available_cents ?? 0);
  const minPayout = Number(payoutConfig?.min_payout_cents ?? 0);
  const allocTotal = (availableOrders ?? []).reduce(
    (sum, o) => sum + Number(o.remaining_artist_earnings_cents ?? o.artist_earnings_cents ?? 0),
    0,
  );
  const requiredPayoutAmount = Math.min(lcAvailable, allocTotal);

  const stripeOk = stripeAvailable >= requiredPayoutAmount && stripeAvailable >= minPayout;
  const lcOk = lcAvailable >= minPayout && requiredPayoutAmount >= minPayout;

  let classification: Classification;
  if (stripeOk && lcOk) {
    classification = "READY_FOR_PAYOUT";
  } else if (!stripeOk && !lcOk) {
    classification = "BOTH_BLOCKED";
  } else if (!stripeOk) {
    classification = "STRIPE_SETTLEMENT_BLOCKED";
  } else {
    classification = "MINIMUM_PAYOUT_BLOCKED";
  }

  const [{ data: golden }, { data: histOrder }, { data: freshOrder }, { data: histDispute }, { data: freshDispute }] =
    await Promise.all([
      admin.from("orders").select("id, status, artist_payout_status, refund_cents").eq("id", GOLDEN).single(),
      admin.from("orders").select("id, artist_payout_status, refund_cents").eq("id", HIST_DISP).single(),
      admin.from("orders").select("id, artist_payout_status, refund_cents").eq("id", FRESH_DISP).single(),
      admin.from("artist_disputes").select("stripe_transfer_reversal_id, metadata").eq("stripe_dispute_id", HIST_DISPUTE).maybeSingle(),
      admin.from("artist_disputes").select("stripe_transfer_reversal_id, metadata").eq("stripe_dispute_id", FRESH_DISPUTE).maybeSingle(),
    ]);

  const { count: payoutCount } = await admin
    .from("artist_payouts")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", ARTIST_ID);

  const stripePayouts = await stripe.payouts.list({ limit: 10 }, { stripeAccount: CONNECT });

  const safety = {
    golden: {
      pass:
        golden?.status === "paid" &&
        golden?.artist_payout_status === "pending" &&
        Number(golden?.refund_cents ?? 0) === 0,
      actual: golden,
    },
    historicalDisp: {
      pass: histOrder?.artist_payout_status === "held",
      reversalPass:
        (histDispute?.metadata as { reversal_amount_cents?: number } | null)?.reversal_amount_cents === 1800 &&
        !!histDispute?.stripe_transfer_reversal_id,
      actual: { order: histOrder, dispute: histDispute },
    },
    freshDisp: {
      pass: freshOrder?.artist_payout_status === "held",
      reversalPass:
        (freshDispute?.metadata as { reversal_amount_cents?: number } | null)?.reversal_amount_cents === 1800 &&
        !!freshDispute?.stripe_transfer_reversal_id,
      actual: { order: freshOrder, dispute: freshDispute },
    },
    noLcPayoutRows: payoutCount === 0,
    noStripePayouts: stripePayouts.data.length === 0,
    allPass:
      golden?.status === "paid" &&
      golden?.artist_payout_status === "pending" &&
      Number(golden?.refund_cents ?? 0) === 0 &&
      histOrder?.artist_payout_status === "held" &&
      freshOrder?.artist_payout_status === "held" &&
      (histDispute?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800 &&
      (freshDispute?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800 &&
      payoutCount === 0 &&
      stripePayouts.data.length === 0,
  };

  const report = {
    phase: "5G.1",
    readOnly: true,
    startedAt: new Date().toISOString(),
    step1_stripeConnectBalance: {
      account: CONNECT,
      availableUsdCents: stripeAvailable,
      pendingUsdCents: stripePending,
      instantAvailableUsdCents: stripeInstant,
      livemode: balance.livemode,
    },
    step2_liveCircuitBalance: {
      artist_id: ARTIST_ID,
      pending_cents: lcBalance?.pending_cents,
      available_cents: lcBalance?.available_cents,
      lifetime_paid_out_cents: lcBalance?.lifetime_paid_out_cents,
      lifeOrder: {
        id: lifeOrder?.id,
        artist_payout_status: lifeOrder?.artist_payout_status,
        remaining_artist_earnings_cents: lifeOrder?.remaining_artist_earnings_cents,
        available_at: lifeOrder?.available_at,
      },
      availableOrderAllocations: availableOrders,
      allocTotalCents: allocTotal,
    },
    step3_payoutThreshold: payoutConfig,
    step4_classification: {
      result: classification,
      requiredPayoutAmountCents: requiredPayoutAmount,
      minPayoutCents: minPayout,
      stripeAvailableCents: stripeAvailable,
      lcAvailableCents: lcAvailable,
      checks: {
        stripeAvailableGteRequired: stripeAvailable >= requiredPayoutAmount,
        stripeAvailableGteMin: stripeAvailable >= minPayout,
        lcAvailableGteMin: lcAvailable >= minPayout,
        requiredGteMin: requiredPayoutAmount >= minPayout,
      },
    },
    step5_safety: safety,
    finishedAt: new Date().toISOString(),
  };

  writeFileSync(join(process.cwd(), "scripts", "phase-5g1-settlement-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
