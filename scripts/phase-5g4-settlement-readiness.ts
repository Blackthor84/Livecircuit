/**
 * Phase 5G.4 — Stripe Connect settlement readiness check (READ-ONLY).
 * Run: npx tsx scripts/phase-5g4-settlement-readiness.ts
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
const LIFE_REQUIRED_CENTS = 1800;
const PROD_MIN_PAYOUT_CENTS = 2500;

type Classification = "SETTLED_READY" | "SETTLEMENT_BLOCKED" | "MINIMUM_BLOCKED" | "BOTH_BLOCKED";

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

async function main() {
  const sk = loadStripeKey();
  const creds = loadServiceKey();
  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  const balance = await stripe.balance.retrieve({}, { stripeAccount: CONNECT });
  const stripePayouts = await stripe.payouts.list({ limit: 20 }, { stripeAccount: CONNECT });
  const stripeAvailable = balance.available.find((b) => b.currency === "usd")?.amount ?? 0;
  const stripePending = balance.pending.find((b) => b.currency === "usd")?.amount ?? 0;
  const stripeInstant = balance.instant_available?.find((b) => b.currency === "usd")?.amount ?? null;

  const [{ data: lcBalance }, { data: lifeOrder }, { data: payoutConfig }, { count: artistPayoutCount }] =
    await Promise.all([
      admin
        .from("artist_balances")
        .select("pending_cents, available_cents, lifetime_paid_out_cents")
        .eq("artist_id", ARTIST_ID)
        .maybeSingle(),
      admin
        .from("orders")
        .select("status, artist_payout_status, remaining_artist_earnings_cents, available_at")
        .eq("id", LIFE_ORDER)
        .single(),
      admin
        .from("monetization_payout_config")
        .select("payout_delay_days, min_payout_cents, reserve_percent, stripe_connect_ready")
        .eq("id", "default")
        .single(),
      admin.from("artist_payouts").select("id", { count: "exact", head: true }).eq("artist_id", ARTIST_ID),
    ]);

  const lcAvailable = Number(lcBalance?.available_cents ?? 0);
  const lifeRemaining = Number(lifeOrder?.remaining_artist_earnings_cents ?? 0);
  const minPayout = Number(payoutConfig?.min_payout_cents ?? PROD_MIN_PAYOUT_CENTS);
  const payoutAmount = Math.min(lcAvailable, lifeRemaining);

  const stripeSettled = stripeAvailable >= LIFE_REQUIRED_CENTS;
  const minimumPass =
    lcAvailable >= minPayout && payoutAmount >= minPayout && minPayout === PROD_MIN_PAYOUT_CENTS;

  let classification: Classification;
  if (stripeSettled && minimumPass) {
    classification = "SETTLED_READY";
  } else if (!stripeSettled && !minimumPass) {
    classification = "BOTH_BLOCKED";
  } else if (!stripeSettled) {
    classification = "SETTLEMENT_BLOCKED";
  } else {
    classification = "MINIMUM_BLOCKED";
  }

  const [
    { data: golden },
    { data: histOrder },
    { data: freshOrder },
    { data: histDispute },
    { data: freshDispute },
  ] = await Promise.all([
    admin.from("orders").select("status, artist_payout_status, refund_cents").eq("id", GOLDEN).single(),
    admin.from("orders").select("artist_payout_status").eq("id", HIST_DISP).single(),
    admin.from("orders").select("artist_payout_status").eq("id", FRESH_DISP).single(),
    admin.from("artist_disputes").select("metadata").eq("stripe_dispute_id", HIST_DISPUTE).maybeSingle(),
    admin.from("artist_disputes").select("metadata").eq("stripe_dispute_id", FRESH_DISPUTE).maybeSingle(),
  ]);

  const report = {
    phase: "5G.4",
    readOnly: true,
    checkedAt: new Date().toISOString(),
    step1_stripeConnectBalance: {
      livemode: balance.livemode,
      available_usd_cents: stripeAvailable,
      pending_usd_cents: stripePending,
      instant_available_usd_cents: stripeInstant,
      existingPayoutCount: stripePayouts.data.length,
    },
    step2_liveCircuitBalance: {
      pending_cents: lcBalance?.pending_cents,
      available_cents: lcBalance?.available_cents,
      lifetime_paid_out_cents: lcBalance?.lifetime_paid_out_cents,
      lifeOrder: {
        status: lifeOrder?.status,
        artist_payout_status: lifeOrder?.artist_payout_status,
        remaining_artist_earnings_cents: lifeOrder?.remaining_artist_earnings_cents,
        available_at: lifeOrder?.available_at,
      },
    },
    step3_payoutConfig: {
      payout_delay_days: payoutConfig?.payout_delay_days,
      min_payout_cents: payoutConfig?.min_payout_cents,
      reserve_percent: payoutConfig?.reserve_percent,
      stripe_connect_ready: payoutConfig?.stripe_connect_ready,
      expectedProduction: {
        payout_delay_days: 7,
        min_payout_cents: PROD_MIN_PAYOUT_CENTS,
        reserve_percent: 0,
        stripe_connect_ready: false,
      },
      configMatchesExpected:
        payoutConfig?.payout_delay_days === 7 &&
        payoutConfig?.min_payout_cents === PROD_MIN_PAYOUT_CENTS &&
        Number(payoutConfig?.reserve_percent) === 0 &&
        payoutConfig?.stripe_connect_ready === false,
    },
    step4_readinessClassification: {
      classification,
      gates: {
        lifeRequiredStripeAvailableCents: LIFE_REQUIRED_CENTS,
        stripeAvailableCents: stripeAvailable,
        stripeSettled,
        productionMinPayoutCents: minPayout,
        lcAvailableCents: lcAvailable,
        lifeRemainingCents: lifeRemaining,
        effectivePayoutAmountCents: payoutAmount,
        minimumPass,
      },
      settlementStatus: stripeSettled ? "SETTLED_READY" : "SETTLEMENT_BLOCKED",
    },
    step5_safetyCheck: {
      golden: {
        pass:
          golden?.status === "paid" &&
          golden?.artist_payout_status === "pending" &&
          Number(golden?.refund_cents ?? 0) === 0,
        status: golden?.status,
        artist_payout_status: golden?.artist_payout_status,
        refund_cents: golden?.refund_cents,
      },
      historicalDisp: {
        pass:
          histOrder?.artist_payout_status === "held" &&
          (histDispute?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800,
        artist_payout_status: histOrder?.artist_payout_status,
        reversal_amount_cents: (histDispute?.metadata as { reversal_amount_cents?: number })
          ?.reversal_amount_cents,
      },
      freshDisp: {
        pass:
          freshOrder?.artist_payout_status === "held" &&
          (freshDispute?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800,
        artist_payout_status: freshOrder?.artist_payout_status,
        reversal_amount_cents: (freshDispute?.metadata as { reversal_amount_cents?: number })
          ?.reversal_amount_cents,
      },
      artist_payouts_count: artistPayoutCount ?? 0,
      stripe_payout_count: stripePayouts.data.length,
      allSafetyChecksPass:
        golden?.status === "paid" &&
        golden?.artist_payout_status === "pending" &&
        Number(golden?.refund_cents ?? 0) === 0 &&
        histOrder?.artist_payout_status === "held" &&
        (histDispute?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800 &&
        freshOrder?.artist_payout_status === "held" &&
        (freshDispute?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800 &&
        (artistPayoutCount ?? 0) === 0 &&
        stripePayouts.data.length === 0,
    },
  };

  writeFileSync(
    join(process.cwd(), "scripts", "phase-5g4-settlement-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
