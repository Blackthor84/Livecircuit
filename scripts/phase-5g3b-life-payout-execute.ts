/**
 * Phase 5G.3B — Execute LIFE payout + duplicate payout E2E.
 * Run: npx tsx -r ./scripts/preload-server-only.cjs scripts/phase-5g3b-life-payout-execute.ts
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { processEligibleArtistPayouts } from "../src/lib/services/artist-payout.service";
import { getPayoutConfig } from "../src/lib/monetization/payout-config.server";

const CONNECT = "acct_1U3xwlEJwfCXyXc7";
const ARTIST_ID = "91b8850b-c145-4fa1-9167-0ba83cd329e8";
const LIFE_ORDER = "2d9d1586-10f9-4255-a47b-d962962d343b";
const GOLDEN = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const HIST_DISP = "56d3952c-43bc-4457-9a4d-e7a50deaec50";
const FRESH_DISP = "0d4e711f-970f-494d-bd54-56f18c3dbda5";
const HIST_DISPUTE = "du_1U5FPtEJwfqaexCo2K4kMbhl";
const FRESH_DISPUTE = "du_1U5GTmEJwfqaexConl1T4Yhc";
const LIFE_ALLOCATION_CENTS = 1800;
const TEST_MIN_PAYOUT_CENTS = 500;
const PROD_MIN_PAYOUT_CENTS = 2500;

const report: Record<string, unknown> = {
  phase: "5G.3B",
  startedAt: new Date().toISOString(),
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function restoreProdMinPayout(admin: ReturnType<typeof createClient>) {
  const { error } = await admin
    .from("monetization_payout_config")
    .update({ min_payout_cents: PROD_MIN_PAYOUT_CENTS, updated_at: new Date().toISOString() })
    .eq("id", "default");
  if (error) return { ok: false, error: error.message };
  const { data } = await admin
    .from("monetization_payout_config")
    .select("min_payout_cents, payout_delay_days, reserve_percent, stripe_connect_ready")
    .eq("id", "default")
    .single();
  return {
    ok: data?.min_payout_cents === PROD_MIN_PAYOUT_CENTS,
    config: data,
  };
}

async function snapshotPayoutState(
  admin: ReturnType<typeof createClient>,
  stripe: Stripe,
  goldenAvailableAt: string | null,
) {
  const [{ data: lc }, { data: life }, { data: payouts }, { data: config }, { data: payoutLedger }] =
    await Promise.all([
      admin.from("artist_balances").select("*").eq("artist_id", ARTIST_ID).maybeSingle(),
      admin.from("orders").select("*").eq("id", LIFE_ORDER).single(),
      admin
        .from("artist_payouts")
        .select("*, artist_payout_orders(*)")
        .eq("artist_id", ARTIST_ID)
        .order("created_at", { ascending: true }),
      admin.from("monetization_payout_config").select("*").eq("id", "default").single(),
      admin
        .from("monetization_financial_ledger")
        .select("*")
        .eq("category", "payout")
        .eq("artist_id", ARTIST_ID)
        .order("created_at", { ascending: true }),
    ]);
  const bal = await stripe.balance.retrieve({}, { stripeAccount: CONNECT });
  const stripePayouts = await stripe.payouts.list({ limit: 20 }, { stripeAccount: CONNECT });
  const { data: golden } = await admin
    .from("orders")
    .select("status, artist_payout_status, refund_cents, available_at")
    .eq("id", GOLDEN)
    .single();
  return {
    lc,
    life,
    payouts: payouts ?? [],
    config,
    bal,
    stripePayouts: stripePayouts.data,
    payoutLedger: payoutLedger ?? [],
    golden,
    goldenAvailableAt,
  };
}

async function verifyProtected(
  admin: ReturnType<typeof createClient>,
  goldenAvailableAt: string | null,
) {
  const [{ data: golden }, { data: hist }, { data: fresh }, { data: hd }, { data: fd }] =
    await Promise.all([
      admin
        .from("orders")
        .select("status, artist_payout_status, refund_cents, available_at")
        .eq("id", GOLDEN)
        .single(),
      admin.from("orders").select("artist_payout_status").eq("id", HIST_DISP).single(),
      admin.from("orders").select("artist_payout_status").eq("id", FRESH_DISP).single(),
      admin.from("artist_disputes").select("metadata").eq("stripe_dispute_id", HIST_DISPUTE).maybeSingle(),
      admin.from("artist_disputes").select("metadata").eq("stripe_dispute_id", FRESH_DISPUTE).maybeSingle(),
    ]);
  return {
    goldenOk:
      golden?.status === "paid" &&
      golden?.artist_payout_status === "pending" &&
      Number(golden?.refund_cents) === 0 &&
      golden?.available_at === goldenAvailableAt,
    histOk:
      hist?.artist_payout_status === "held" &&
      (hd?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800,
    freshOk:
      fresh?.artist_payout_status === "held" &&
      (fd?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800,
    golden,
    hist,
    fresh,
  };
}

function writeReport() {
  writeFileSync(
    join(process.cwd(), "scripts", "phase-5g3b-life-payout-report.json"),
    JSON.stringify(report, null, 2),
  );
}

async function main() {
  const sk = loadStripeKey();
  const creds = loadServiceKey();
  process.env.STRIPE_SECRET_KEY = sk;
  process.env.SUPABASE_SERVICE_ROLE_KEY = creds.key;
  process.env.NEXT_PUBLIC_SUPABASE_URL = creds.url;

  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  const { data: goldenBefore } = await admin
    .from("orders")
    .select("available_at")
    .eq("id", GOLDEN)
    .single();
  const goldenAvailableAt = (goldenBefore?.available_at as string | null) ?? null;

  // STEP 0 — Pre-flight
  const before = await snapshotPayoutState(admin, stripe, goldenAvailableAt);
  const stripeAvailable = before.bal.available.find((b) => b.currency === "usd")?.amount ?? 0;
  const stripePending = before.bal.pending.find((b) => b.currency === "usd")?.amount ?? 0;
  const payoutLedgerCount = before.payoutLedger.length;

  report.step0_preFlight = {
    stripeLivemode: before.bal.livemode,
    connectAccount: CONNECT,
    payoutConfig: {
      payout_delay_days: before.config?.payout_delay_days,
      min_payout_cents: before.config?.min_payout_cents,
      reserve_percent: before.config?.reserve_percent,
      stripe_connect_ready: before.config?.stripe_connect_ready,
    },
    lifeOrder: {
      status: before.life?.status,
      artist_payout_status: before.life?.artist_payout_status,
      remaining_artist_earnings_cents: before.life?.remaining_artist_earnings_cents,
    },
    lcAvailable: before.lc?.available_cents,
    artistPayoutsCount: before.payouts.length,
    stripeAvailableCents: stripeAvailable,
    stripePendingCents: stripePending,
  };

  const preflightFail: string[] = [];
  if (before.bal.livemode) preflightFail.push("not_test_mode");
  if (before.config?.min_payout_cents !== TEST_MIN_PAYOUT_CENTS) preflightFail.push("min_payout_not_500");
  if (before.config?.payout_delay_days !== 7) preflightFail.push("payout_delay_not_7");
  if (Number(before.config?.reserve_percent) !== 0) preflightFail.push("reserve_percent_not_0");
  if (before.config?.stripe_connect_ready !== false) preflightFail.push("stripe_connect_ready_not_false");
  if (before.life?.status !== "paid") preflightFail.push("life_not_paid");
  if (before.life?.artist_payout_status !== "available") preflightFail.push("life_not_available");
  if (Number(before.life?.remaining_artist_earnings_cents) !== LIFE_ALLOCATION_CENTS)
    preflightFail.push("life_remaining_not_1800");
  if (Number(before.lc?.available_cents) !== LIFE_ALLOCATION_CENTS) preflightFail.push("lc_available_not_1800");
  if (before.payouts.length !== 0) preflightFail.push("artist_payouts_not_zero");
  if (stripeAvailable < LIFE_ALLOCATION_CENTS) preflightFail.push("stripe_available_insufficient");

  if (preflightFail.length > 0) {
    report.step1_beforeState = {
      lc: {
        available_cents: before.lc?.available_cents,
        pending_cents: before.lc?.pending_cents,
        lifetime_paid_out_cents: before.lc?.lifetime_paid_out_cents,
      },
      artist_payouts_count: before.payouts.length,
      payout_ledger_count: payoutLedgerCount,
      life: {
        artist_payout_status: before.life?.artist_payout_status,
        remaining_artist_earnings_cents: before.life?.remaining_artist_earnings_cents,
      },
      stripe: {
        available: stripeAvailable,
        pending: stripePending,
        payoutCount: before.stripePayouts.length,
      },
    };
    report.classification = preflightFail.includes("stripe_available_insufficient")
      ? "BLOCKED"
      : "FAIL";
    report.blockedReasons = preflightFail;
    report.step8_configRestore = await restoreProdMinPayout(admin);
    report.step9_protectedObjects = await verifyProtected(admin, goldenAvailableAt);
    report.finishedAt = new Date().toISOString();
    writeReport();
    console.log(
      JSON.stringify(
        { classification: report.classification, blockedReasons: preflightFail, stripeAvailable },
        null,
        2,
      ),
    );
    return;
  }

  // STEP 1 — Before state (read-only)
  report.step1_beforeState = {
    lc: {
      available_cents: before.lc?.available_cents,
      pending_cents: before.lc?.pending_cents,
      lifetime_paid_out_cents: before.lc?.lifetime_paid_out_cents,
    },
    artist_payouts_count: before.payouts.length,
    payout_ledger_count: payoutLedgerCount,
    life: {
      artist_payout_status: before.life?.artist_payout_status,
      remaining_artist_earnings_cents: before.life?.remaining_artist_earnings_cents,
    },
    stripe: {
      available: stripeAvailable,
      pending: stripePending,
      payoutCount: before.stripePayouts.length,
    },
  };

  const config = await getPayoutConfig(admin);
  const expectedIdempotencyKey = `payout:${ARTIST_ID}:${LIFE_ALLOCATION_CENTS}:${LIFE_ORDER}`;

  // STEP 2 — Execute payout pipeline
  const payoutAttempt1 = await processEligibleArtistPayouts(admin);
  report.step2_executePayout = payoutAttempt1;
  await sleep(10000);

  const mid = await snapshotPayoutState(admin, stripe, goldenAvailableAt);
  const newPayout = mid.payouts.find((p) => !before.payouts.some((b) => b.id === p.id));

  if (payoutAttempt1.payoutsCreated > 1) {
    report.classification = "FAIL";
    report.failReason = "more_than_one_payout_created";
    report.step8_configRestore = await restoreProdMinPayout(admin);
    report.finishedAt = new Date().toISOString();
    writeReport();
    throw new Error("STOP: more than one payout created");
  }

  if (payoutAttempt1.payoutsCreated !== 1 || !newPayout) {
    report.classification = "FAIL";
    report.failReason = "payout_not_created";
    report.step8_configRestore = await restoreProdMinPayout(admin);
    report.finishedAt = new Date().toISOString();
    writeReport();
    throw new Error("STOP: expected exactly one payout");
  }

  if (newPayout.amount_cents !== LIFE_ALLOCATION_CENTS) {
    report.classification = "FAIL";
    report.failReason = "unexpected_payout_amount";
    report.step8_configRestore = await restoreProdMinPayout(admin);
    report.finishedAt = new Date().toISOString();
    writeReport();
    throw new Error(`STOP: payout amount ${newPayout.amount_cents} != ${LIFE_ALLOCATION_CENTS}`);
  }

  // STEP 3 — Verify Stripe payout
  let stripePayoutObj: Stripe.Payout | null = null;
  if (newPayout.stripe_payout_id) {
    stripePayoutObj = await stripe.payouts.retrieve(newPayout.stripe_payout_id as string, {
      stripeAccount: CONNECT,
    });
  }

  const newStripePayouts = mid.stripePayouts.filter(
    (p) => !before.stripePayouts.some((b) => b.id === p.id),
  );

  report.step3_stripePayout = {
    exactlyOneNewPayout: newStripePayouts.length === 1,
    stripePayout: stripePayoutObj
      ? {
          id: stripePayoutObj.id,
          amount: stripePayoutObj.amount,
          currency: stripePayoutObj.currency,
          status: stripePayoutObj.status,
          arrival_date: stripePayoutObj.arrival_date,
          destination: stripePayoutObj.destination,
          metadata: stripePayoutObj.metadata,
        }
      : null,
    persistedStripePayoutId: newPayout.stripe_payout_id,
    lcPayoutId: newPayout.id,
    idempotencyKey: newPayout.idempotency_key ?? expectedIdempotencyKey,
    amountOk: stripePayoutObj?.amount === LIFE_ALLOCATION_CENTS,
    currencyOk: stripePayoutObj?.currency === "usd",
  };

  // STEP 4 — Verify LiveCircuit accounting
  const payoutLedgerAfter = mid.payoutLedger.filter(
    (e) => !before.payoutLedger.some((b) => b.id === e.id),
  );

  report.step4_liveCircuitAccounting = {
    lcBefore: {
      available_cents: before.lc?.available_cents,
      pending_cents: before.lc?.pending_cents,
      lifetime_paid_out_cents: before.lc?.lifetime_paid_out_cents,
    },
    lcAfter: {
      available_cents: mid.lc?.available_cents,
      pending_cents: mid.lc?.pending_cents,
      lifetime_paid_out_cents: mid.lc?.lifetime_paid_out_cents,
    },
    lifeBefore: {
      artist_payout_status: before.life?.artist_payout_status,
      remaining_artist_earnings_cents: before.life?.remaining_artist_earnings_cents,
    },
    lifeAfter: {
      artist_payout_status: mid.life?.artist_payout_status,
      remaining_artist_earnings_cents: mid.life?.remaining_artist_earnings_cents,
    },
    artistPayoutRow: newPayout,
    newPayoutLedgerEntries: payoutLedgerAfter,
    payoutLedgerCountAfter: mid.payoutLedger.length,
    artistPayoutsCount: mid.payouts.length,
    availableMoved1800to0: Number(before.lc?.available_cents) - Number(mid.lc?.available_cents) === LIFE_ALLOCATION_CENTS,
    lifetimeMoved0to1800:
      Number(mid.lc?.lifetime_paid_out_cents) - Number(before.lc?.lifetime_paid_out_cents) ===
      LIFE_ALLOCATION_CENTS,
  };

  // STEP 5 — Webhooks
  await sleep(5000);
  const { data: wh } = await admin
    .from("monetization_stripe_webhook_events")
    .select("*")
    .in("event_type", ["payout.created", "payout.paid", "payout.failed", "payout.canceled"])
    .order("processed_at", { ascending: false })
    .limit(30);

  const payoutWebhooks = (wh ?? []).filter((e) => {
    const obj = (e.payload as { data?: { object?: { id?: string; metadata?: { payout_id?: string } } } })
      ?.data?.object;
    return obj?.id === newPayout.stripe_payout_id || obj?.metadata?.payout_id === newPayout.id;
  });

  report.step5_webhooks = {
    payoutWebhooks: payoutWebhooks.map((e) => ({
      stripe_event_id: e.stripe_event_id,
      event_type: e.event_type,
      status: e.status,
      processed_at: e.processed_at,
      order_id: e.order_id,
    })),
    deliveredProcessed: payoutWebhooks.every((e) => e.status === "processed"),
    uniqueEventIds: [...new Set(payoutWebhooks.map((e) => e.stripe_event_id))].length === payoutWebhooks.length,
  };

  // STEP 6 — Duplicate payout test
  const payoutAttempt2 = await processEligibleArtistPayouts(admin);
  await sleep(3000);
  const afterDup = await snapshotPayoutState(admin, stripe, goldenAvailableAt);

  report.step6_duplicatePayout = {
    payoutAttempt2,
    payoutCountBefore: mid.payouts.length,
    payoutCountAfter: afterDup.payouts.length,
    stripePayoutCountBefore: mid.stripePayouts.length,
    stripePayoutCountAfter: afterDup.stripePayouts.length,
    lcAvailableBefore: mid.lc?.available_cents,
    lcAvailableAfter: afterDup.lc?.available_cents,
    lifetimeBefore: mid.lc?.lifetime_paid_out_cents,
    lifetimeAfter: afterDup.lc?.lifetime_paid_out_cents,
    payoutLedgerCountBefore: mid.payoutLedger.length,
    payoutLedgerCountAfter: afterDup.payoutLedger.length,
    skipReasons: payoutAttempt2.skipReasons,
  };

  // STEP 7 — Final reconciliation
  report.step7_reconciliation = {
    stripe: {
      payoutId: stripePayoutObj?.id,
      amount: stripePayoutObj?.amount,
      status: stripePayoutObj?.status,
      connectAccount: CONNECT,
      payoutCountBefore: before.stripePayouts.length,
      payoutCountAfter: afterDup.stripePayouts.length,
      availableBefore: stripeAvailable,
      availableAfter: afterDup.bal.available.find((b) => b.currency === "usd")?.amount ?? 0,
      pendingBefore: stripePending,
      pendingAfter: afterDup.bal.pending.find((b) => b.currency === "usd")?.amount ?? 0,
    },
    liveCircuit: {
      availableBefore: before.lc?.available_cents,
      availableAfter: afterDup.lc?.available_cents,
      pendingBefore: before.lc?.pending_cents,
      pendingAfter: afterDup.lc?.pending_cents,
      lifetimeBefore: before.lc?.lifetime_paid_out_cents,
      lifetimeAfter: afterDup.lc?.lifetime_paid_out_cents,
      artistPayoutsBefore: before.payouts.length,
      artistPayoutsAfter: afterDup.payouts.length,
      payoutLedgerBefore: before.payoutLedger.length,
      payoutLedgerAfter: afterDup.payoutLedger.length,
      lifeBefore: {
        artist_payout_status: before.life?.artist_payout_status,
        remaining_artist_earnings_cents: before.life?.remaining_artist_earnings_cents,
      },
      lifeAfter: {
        artist_payout_status: afterDup.life?.artist_payout_status,
        remaining_artist_earnings_cents: afterDup.life?.remaining_artist_earnings_cents,
      },
    },
    expectedMovement: "$18.00 available → $18.00 paid out → $0.00 available",
  };

  // STEP 8 — Restore production config
  report.step8_configRestore = await restoreProdMinPayout(admin);

  // STEP 9 — Protected objects
  const protectedAfter = await verifyProtected(admin, goldenAvailableAt);
  report.step9_protectedObjects = protectedAfter;

  const stripeOk =
    newStripePayouts.length === 1 &&
    stripePayoutObj?.amount === LIFE_ALLOCATION_CENTS &&
    stripePayoutObj.currency === "usd";
  const lcOk =
    Number(afterDup.lc?.available_cents) === 0 &&
    Number(afterDup.lc?.lifetime_paid_out_cents) === LIFE_ALLOCATION_CENTS &&
    afterDup.payouts.length === 1 &&
    afterDup.payoutLedger.length === before.payoutLedger.length + 1;
  const dupOk =
    payoutAttempt2.payoutsCreated === 0 &&
    afterDup.payouts.length === mid.payouts.length &&
    afterDup.stripePayouts.length === mid.stripePayouts.length &&
    Number(afterDup.lc?.available_cents) === Number(mid.lc?.available_cents) &&
    Number(afterDup.lc?.lifetime_paid_out_cents) === Number(mid.lc?.lifetime_paid_out_cents);
  const configRestored = (report.step8_configRestore as { ok: boolean }).ok;
  const protectedOk =
    protectedAfter.goldenOk && protectedAfter.histOk && protectedAfter.freshOk;

  report.classification =
    stripeOk && lcOk && dupOk && configRestored && protectedOk ? "PASS" : "FAIL";
  report.finishedAt = new Date().toISOString();
  writeReport();
  console.log(
    JSON.stringify(
      {
        classification: report.classification,
        step2: payoutAttempt1,
        step6: payoutAttempt2,
        step8: report.step8_configRestore,
      },
      null,
      2,
    ),
  );

  if (report.classification !== "PASS") process.exit(1);
}

main().catch(async (e) => {
  report.fatalError = e instanceof Error ? e.message : String(e);
  report.classification = report.classification ?? "FAIL";
  report.finishedAt = new Date().toISOString();
  writeReport();
  console.error(e);
  process.exit(1);
});
