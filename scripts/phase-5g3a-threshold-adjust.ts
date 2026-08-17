/**
 * Phase 5G.3A — Controlled TEST payout threshold adjustment (no payout execution).
 * Run: npx tsx -r ./scripts/preload-server-only.cjs scripts/phase-5g3a-threshold-adjust.ts
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
const LIFE_ALLOCATION_CENTS = 1800;
const TEST_MIN_PAYOUT_CENTS = 500;

const report: Record<string, unknown> = {
  phase: "5G.3A",
  startedAt: new Date().toISOString(),
  payoutExecuted: false,
};

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

async function readState(
  admin: ReturnType<typeof createClient>,
  stripe: Stripe,
) {
  const [
    { data: config },
    { data: lc },
    { data: life },
    { count: payoutCount },
    { data: payouts },
  ] = await Promise.all([
    admin
      .from("monetization_payout_config")
      .select("payout_delay_days, min_payout_cents, reserve_percent, stripe_connect_ready")
      .eq("id", "default")
      .single(),
    admin.from("artist_balances").select("*").eq("artist_id", ARTIST_ID).maybeSingle(),
    admin
      .from("orders")
      .select("id, artist_payout_status, remaining_artist_earnings_cents, status")
      .eq("id", LIFE_ORDER)
      .single(),
    admin
      .from("artist_payouts")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", ARTIST_ID),
    admin.from("artist_payouts").select("id").eq("artist_id", ARTIST_ID),
  ]);

  const balance = await stripe.balance.retrieve({}, { stripeAccount: CONNECT });
  const stripeAvailable = balance.available.find((b) => b.currency === "usd")?.amount ?? 0;
  const stripePending = balance.pending.find((b) => b.currency === "usd")?.amount ?? 0;

  return {
    config,
    lc,
    life,
    payoutCount: payoutCount ?? 0,
    payouts: payouts ?? [],
    stripe: { available: stripeAvailable, pending: stripePending },
  };
}

async function main() {
  const sk = loadStripeKey();
  const creds = loadServiceKey();
  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  // Step 1 — Safety snapshot
  const before = await readState(admin, stripe);
  report.step1_safetySnapshot = {
    payout_delay_days: before.config?.payout_delay_days,
    min_payout_cents: before.config?.min_payout_cents,
    reserve_percent: before.config?.reserve_percent,
    stripe_connect_ready: before.config?.stripe_connect_ready,
    lc_available_cents: before.lc?.available_cents,
    lc_pending_cents: before.lc?.pending_cents,
    lifetime_paid_out_cents: before.lc?.lifetime_paid_out_cents,
    life_artist_payout_status: before.life?.artist_payout_status,
    life_remaining_artist_earnings_cents: before.life?.remaining_artist_earnings_cents,
    stripe_connect_available: before.stripe.available,
    stripe_connect_pending: before.stripe.pending,
    artist_payouts_count: before.payoutCount,
  };

  if (before.payoutCount !== 0) {
    report.status = "ABORTED";
    report.reason = `Expected artist_payouts count = 0, found ${before.payoutCount}`;
    writeReport();
    throw new Error(report.reason as string);
  }

  // Step 2 — TEST-only configuration (min_payout_cents only)
  const { error: updateError } = await admin
    .from("monetization_payout_config")
    .update({ min_payout_cents: TEST_MIN_PAYOUT_CENTS, updated_at: new Date().toISOString() })
    .eq("id", "default");
  if (updateError) throw new Error(`Config update failed: ${updateError.message}`);

  report.step2_configUpdate = {
    changed: { min_payout_cents: TEST_MIN_PAYOUT_CENTS },
    unchanged: {
      payout_delay_days: before.config?.payout_delay_days,
      reserve_percent: before.config?.reserve_percent,
      stripe_connect_ready: before.config?.stripe_connect_ready,
    },
  };

  // Step 3 — Verify configuration
  const afterConfig = await readState(admin, stripe);
  const configOk =
    afterConfig.config?.payout_delay_days === 7 &&
    afterConfig.config?.min_payout_cents === TEST_MIN_PAYOUT_CENTS &&
    afterConfig.config?.reserve_percent === 0 &&
    afterConfig.config?.stripe_connect_ready === false;

  const lifeOk =
    afterConfig.life?.artist_payout_status === "available" &&
    Number(afterConfig.life?.remaining_artist_earnings_cents) === LIFE_ALLOCATION_CENTS;

  const noPayoutCreated = afterConfig.payoutCount === 0;

  report.step3_verifyConfiguration = {
    configOk,
    payout_delay_days: afterConfig.config?.payout_delay_days,
    min_payout_cents: afterConfig.config?.min_payout_cents,
    reserve_percent: afterConfig.config?.reserve_percent,
    stripe_connect_ready: afterConfig.config?.stripe_connect_ready,
    life_artist_payout_status: afterConfig.life?.artist_payout_status,
    life_remaining_artist_earnings_cents: afterConfig.life?.remaining_artist_earnings_cents,
    lifeOk,
    artist_payouts_count: afterConfig.payoutCount,
    noPayoutCreated,
  };

  if (!configOk) throw new Error("Configuration verification failed after update");
  if (!lifeOk) throw new Error("LIFE order state changed unexpectedly");
  if (!noPayoutCreated) throw new Error("Payout was created unexpectedly");

  // Step 4 — Stripe settlement check
  const stripeAvailable = afterConfig.stripe.available;
  report.step4_stripeSettlement = {
    stripe_connect_available: stripeAvailable,
    stripe_connect_pending: afterConfig.stripe.pending,
    required_cents: LIFE_ALLOCATION_CENTS,
    settlementOk: stripeAvailable >= LIFE_ALLOCATION_CENTS,
  };

  if (stripeAvailable < LIFE_ALLOCATION_CENTS) {
    report.status = "STRIPE_SETTLEMENT_BLOCKED";
    report.nextStepBlocked = true;
    report.message =
      "min_payout_cents temporarily set to 500; payout processing NOT executed — Stripe available < 1800";
  } else {
    // Step 5 — Pre-payout readiness (still no execution)
    report.step5_prePayoutReadiness = {
      min_payout_cents: afterConfig.config?.min_payout_cents,
      lc_available_cents: afterConfig.lc?.available_cents,
      life_allocation_cents: afterConfig.life?.remaining_artist_earnings_cents,
      stripe_available: stripeAvailable,
      readyForAuthorizedExecution:
        afterConfig.config?.min_payout_cents === TEST_MIN_PAYOUT_CENTS &&
        Number(afterConfig.lc?.available_cents) === LIFE_ALLOCATION_CENTS &&
        Number(afterConfig.life?.remaining_artist_earnings_cents) === LIFE_ALLOCATION_CENTS &&
        stripeAvailable >= LIFE_ALLOCATION_CENTS,
    };
    report.status = "READY_FOR_AUTHORIZED_PAYOUT_EXECUTION";
    report.message =
      "Configuration adjusted; all pre-payout gates pass — awaiting explicit authorization to call processEligibleArtistPayouts()";
  }

  // Protected object spot-check (read-only)
  const [{ data: golden }, { data: hist }, { data: fresh }] = await Promise.all([
    admin.from("orders").select("id, status, artist_payout_status").eq("id", GOLDEN).single(),
    admin.from("orders").select("id, artist_payout_status").eq("id", HIST_DISP).single(),
    admin.from("orders").select("id, artist_payout_status").eq("id", FRESH_DISP).single(),
  ]);
  report.protectedObjects = {
    golden: { id: golden?.id, status: golden?.status, artist_payout_status: golden?.artist_payout_status },
    life: { id: afterConfig.life?.id, artist_payout_status: afterConfig.life?.artist_payout_status },
    historicalDisp: { id: hist?.id, artist_payout_status: hist?.artist_payout_status },
    freshDisp: { id: fresh?.id, artist_payout_status: fresh?.artist_payout_status },
  };

  report.completedAt = new Date().toISOString();
  report.restoreReminder = "Restore min_payout_cents = 2500 after authorized payout E2E completes";
  writeReport();
  console.log(JSON.stringify(report, null, 2));
}

function writeReport() {
  writeFileSync(
    join(process.cwd(), "scripts", "phase-5g3a-threshold-report.json"),
    JSON.stringify(report, null, 2),
  );
}

main().catch((err) => {
  report.status = report.status ?? "ERROR";
  report.error = err instanceof Error ? err.message : String(err);
  report.completedAt = new Date().toISOString();
  writeReport();
  console.error(err);
  process.exit(1);
});
