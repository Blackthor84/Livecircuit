/**
 * Phase 5G.6 — Stripe Connect settlement check (READ-ONLY).
 * Run: npx tsx scripts/phase-5g6-settlement-readiness.ts
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
const REQUIRED_CENTS = 1800;

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
  const stripe = new Stripe(loadStripeKey(), { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });
  const creds = loadServiceKey();
  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });

  const balance = await stripe.balance.retrieve({}, { stripeAccount: CONNECT });
  const stripePayouts = await stripe.payouts.list({ limit: 20 }, { stripeAccount: CONNECT });
  const stripeAvailable = balance.available.find((b) => b.currency === "usd")?.amount ?? 0;
  const stripePending = balance.pending.find((b) => b.currency === "usd")?.amount ?? 0;
  const stripeInstant = balance.instant_available?.find((b) => b.currency === "usd")?.amount ?? null;

  const [{ data: lc }, { data: life }, { data: config }, { count: artistPayoutCount }] =
    await Promise.all([
      admin
        .from("artist_balances")
        .select("available_cents, pending_cents, lifetime_paid_out_cents")
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

  const [
    { data: golden },
    { data: hist },
    { data: fresh },
    { data: histDispute },
    { data: freshDispute },
  ] = await Promise.all([
    admin.from("orders").select("status, artist_payout_status, refund_cents").eq("id", GOLDEN).single(),
    admin.from("orders").select("artist_payout_status").eq("id", HIST_DISP).single(),
    admin.from("orders").select("artist_payout_status").eq("id", FRESH_DISP).single(),
    admin.from("artist_disputes").select("metadata").eq("stripe_dispute_id", HIST_DISPUTE).maybeSingle(),
    admin.from("artist_disputes").select("metadata").eq("stripe_dispute_id", FRESH_DISPUTE).maybeSingle(),
  ]);

  const classification = stripeAvailable >= REQUIRED_CENTS ? "SETTLED_READY" : "SETTLEMENT_BLOCKED";

  const report = {
    phase: "5G.6",
    readOnly: true,
    checkedAt: new Date().toISOString(),
    step1_stripeConnect: {
      livemode: balance.livemode,
      balance_available_usd_cents: stripeAvailable,
      balance_pending_usd_cents: stripePending,
      balance_instant_available_usd_cents: stripeInstant,
      stripePayoutCount: stripePayouts.data.length,
    },
    step2_liveCircuit: {
      artist: {
        available_cents: lc?.available_cents,
        pending_cents: lc?.pending_cents,
        lifetime_paid_out_cents: lc?.lifetime_paid_out_cents,
      },
      lifeOrder: {
        status: life?.status,
        artist_payout_status: life?.artist_payout_status,
        remaining_artist_earnings_cents: life?.remaining_artist_earnings_cents,
        available_at: life?.available_at,
      },
    },
    step3_config: {
      payout_delay_days: config?.payout_delay_days,
      min_payout_cents: config?.min_payout_cents,
      reserve_percent: config?.reserve_percent,
      stripe_connect_ready: config?.stripe_connect_ready,
      expectedProduction: {
        payout_delay_days: 7,
        min_payout_cents: 2500,
        reserve_percent: 0,
        stripe_connect_ready: false,
      },
      matchesExpected:
        config?.payout_delay_days === 7 &&
        config?.min_payout_cents === 2500 &&
        Number(config?.reserve_percent) === 0 &&
        config?.stripe_connect_ready === false,
    },
    step4_classification: classification,
    step5_safetyCheck: {
      golden: {
        pass:
          golden?.status === "paid" &&
          golden?.artist_payout_status === "pending" &&
          Number(golden?.refund_cents) === 0,
        status: golden?.status,
        artist_payout_status: golden?.artist_payout_status,
        refund_cents: golden?.refund_cents,
      },
      historicalDisp: {
        pass:
          hist?.artist_payout_status === "held" &&
          (histDispute?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800,
        artist_payout_status: hist?.artist_payout_status,
        reversal_amount_cents: (histDispute?.metadata as { reversal_amount_cents?: number })
          ?.reversal_amount_cents,
      },
      freshDisp: {
        pass:
          fresh?.artist_payout_status === "held" &&
          (freshDispute?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800,
        artist_payout_status: fresh?.artist_payout_status,
        reversal_amount_cents: (freshDispute?.metadata as { reversal_amount_cents?: number })
          ?.reversal_amount_cents,
      },
      artist_payouts_count: artistPayoutCount ?? 0,
      stripe_payout_count: stripePayouts.data.length,
      allSafetyChecksPass:
        golden?.status === "paid" &&
        golden?.artist_payout_status === "pending" &&
        Number(golden?.refund_cents) === 0 &&
        hist?.artist_payout_status === "held" &&
        (histDispute?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800 &&
        fresh?.artist_payout_status === "held" &&
        (freshDispute?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800 &&
        (artistPayoutCount ?? 0) === 0 &&
        stripePayouts.data.length === 0,
    },
    nextStep:
      classification === "SETTLED_READY"
        ? "Phase 5G.5 is ready to execute"
        : "Wait for Stripe Connect balance.available >= 1800 before running Phase 5G.5",
  };

  writeFileSync(
    join(process.cwd(), "scripts", "phase-5g6-settlement-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
