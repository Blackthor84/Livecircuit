/**
 * Phase 5G.5 — LIFE payout + duplicate payout E2E execution.
 * Run: npx tsx -r ./scripts/preload-server-only.cjs scripts/phase-5g5-life-payout-execute.ts
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { processEligibleArtistPayouts } from "../src/lib/services/artist-payout.service";

const CONNECT = "acct_1U3xwlEJwfCXyXc7";
const ARTIST_ID = "91b8850b-c145-4fa1-9167-0ba83cd329e8";
const LIFE_ORDER = "2d9d1586-10f9-4255-a47b-d962962d343b";
const GOLDEN = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const HIST_DISP = "56d3952c-43bc-4457-9a4d-e7a50deaec50";
const FRESH_DISP = "0d4e711f-970f-494d-bd54-56f18c3dbda5";
const HIST_DISPUTE = "du_1U5FPtEJwfqaexCo2K4kMbhl";
const FRESH_DISPUTE = "du_1U5GTmEJwfqaexConl1T4Yhc";
const LIFE_CENTS = 1800;
const TEST_MIN = 500;
const PROD_MIN = 2500;

const report: Record<string, unknown> = { phase: "5G.5", startedAt: new Date().toISOString() };

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

function writeReport() {
  writeFileSync(
    join(process.cwd(), "scripts", "phase-5g5-life-payout-report.json"),
    JSON.stringify(report, null, 2),
  );
}

async function getConfig(admin: ReturnType<typeof createClient>) {
  const { data } = await admin
    .from("monetization_payout_config")
    .select("payout_delay_days, min_payout_cents, reserve_percent, stripe_connect_ready")
    .eq("id", "default")
    .single();
  return data;
}

async function setMinPayout(admin: ReturnType<typeof createClient>, cents: number) {
  const { error } = await admin
    .from("monetization_payout_config")
    .update({ min_payout_cents: cents, updated_at: new Date().toISOString() })
    .eq("id", "default");
  if (error) throw new Error(error.message);
  return getConfig(admin);
}

async function snapshot(admin: ReturnType<typeof createClient>, stripe: Stripe) {
  const [
    { data: lc },
    { data: life },
    { data: payouts },
    { data: config },
    { data: ledger },
    { count: payoutCount },
  ] = await Promise.all([
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
    admin.from("artist_payouts").select("id", { count: "exact", head: true }).eq("artist_id", ARTIST_ID),
  ]);
  const bal = await stripe.balance.retrieve({}, { stripeAccount: CONNECT });
  const stripePayouts = await stripe.payouts.list({ limit: 20 }, { stripeAccount: CONNECT });
  return {
    lc,
    life,
    payouts: payouts ?? [],
    config,
    ledger: ledger ?? [],
    payoutCount: payoutCount ?? 0,
    bal,
    stripePayouts: stripePayouts.data,
    stripeAvailable: bal.available.find((b) => b.currency === "usd")?.amount ?? 0,
    stripePending: bal.pending.find((b) => b.currency === "usd")?.amount ?? 0,
  };
}

async function verifyProtected(admin: ReturnType<typeof createClient>, goldenAvailableAt: string | null) {
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

function classifyResult(report: Record<string, unknown>): "PASS" | "BLOCKED" | "FAIL" {
  if (report.classification) return report.classification as "PASS" | "BLOCKED" | "FAIL";
  return "FAIL";
}

async function main() {
  const sk = loadStripeKey();
  const creds = loadServiceKey();
  process.env.STRIPE_SECRET_KEY = sk;
  process.env.SUPABASE_SERVICE_ROLE_KEY = creds.key;
  process.env.NEXT_PUBLIC_SUPABASE_URL = creds.url;

  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  const { data: goldenRef } = await admin
    .from("orders")
    .select("available_at")
    .eq("id", GOLDEN)
    .single();
  const goldenAvailableAt = (goldenRef?.available_at as string | null) ?? null;

  const initial = await snapshot(admin, stripe);
  report.step0_preFlight = {
    connectAccount: CONNECT,
    lifeOrder: LIFE_ORDER,
    artistId: ARTIST_ID,
    stripeLivemode: initial.bal.livemode,
    lifeStatus: initial.life?.status,
    lifeArtistPayoutStatus: initial.life?.artist_payout_status,
    lifeRemainingCents: initial.life?.remaining_artist_earnings_cents,
    lcAvailableCents: initial.lc?.available_cents,
    stripeAvailableCents: initial.stripeAvailable,
    artistPayoutsCount: initial.payoutCount,
    stripePayoutCount: initial.stripePayouts.length,
    payoutConfig: initial.config,
  };

  const preflightFail: string[] = [];
  if (initial.bal.livemode) preflightFail.push("not_test_mode");
  if (initial.life?.status !== "paid") preflightFail.push("life_not_paid");
  if (initial.life?.artist_payout_status !== "available") preflightFail.push("life_not_available");
  if (Number(initial.life?.remaining_artist_earnings_cents) !== LIFE_CENTS) preflightFail.push("life_remaining_not_1800");
  if (Number(initial.lc?.available_cents) < LIFE_CENTS) preflightFail.push("lc_available_insufficient");
  if (initial.stripeAvailable < LIFE_CENTS) preflightFail.push("stripe_available_insufficient");
  if (initial.payoutCount !== 0) preflightFail.push("artist_payouts_not_zero");
  if (initial.stripePayouts.length !== 0) preflightFail.push("stripe_payouts_not_zero");

  if (preflightFail.length > 0) {
    report.classification = preflightFail.includes("stripe_available_insufficient") ? "BLOCKED" : "FAIL";
    report.stopReasons = preflightFail;
    report.step9_finalReconciliation = {
      protectedObjects: await verifyProtected(admin, goldenAvailableAt),
      note: "Stopped at pre-flight; no payout executed; config unchanged",
    };
    report.finishedAt = new Date().toISOString();
    writeReport();
    console.log(JSON.stringify({ classification: report.classification, stopReasons: preflightFail }, null, 2));
    return;
  }

  // STEP 1 — Temporary test minimum
  report.step1_configBefore = initial.config;
  const configAfterTestMin = await setMinPayout(admin, TEST_MIN);
  report.step1_configAfterTestMin = configAfterTestMin;
  if (configAfterTestMin?.min_payout_cents !== TEST_MIN) {
    await setMinPayout(admin, PROD_MIN);
    throw new Error("Failed to set min_payout_cents to 500");
  }

  // STEP 2 — Re-check eligibility
  const recheck = await snapshot(admin, stripe);
  const gatesOk =
    Number(recheck.lc?.available_cents) >= TEST_MIN &&
    Number(recheck.life?.remaining_artist_earnings_cents) === LIFE_CENTS &&
    recheck.stripeAvailable >= LIFE_CENTS;

  report.step2_eligibility = {
    lcAvailable: recheck.lc?.available_cents,
    lifeAllocation: recheck.life?.remaining_artist_earnings_cents,
    stripeAvailable: recheck.stripeAvailable,
    minPayoutCents: configAfterTestMin?.min_payout_cents,
    gatesOk,
  };

  if (!gatesOk) {
    report.classification = "BLOCKED";
    report.stopReasons = ["eligibility_gates_failed_after_config_change"];
    report.step8_configRestore = await setMinPayout(admin, PROD_MIN);
    report.finishedAt = new Date().toISOString();
    writeReport();
    console.log(JSON.stringify({ classification: "BLOCKED", step2: report.step2_eligibility }, null, 2));
    return;
  }

  const before = recheck;
  report.beforeState = {
    lc: {
      available_cents: before.lc?.available_cents,
      pending_cents: before.lc?.pending_cents,
      lifetime_paid_out_cents: before.lc?.lifetime_paid_out_cents,
    },
    artistPayoutsCount: before.payoutCount,
    payoutLedgerCount: before.ledger.length,
    stripePayoutCount: before.stripePayouts.length,
    stripeAvailable: before.stripeAvailable,
    stripePending: before.stripePending,
  };

  // STEP 3 — Execute payout
  const attempt1 = await processEligibleArtistPayouts(admin);
  report.step3_executePayout = attempt1;
  await sleep(12000);

  const afterPayout = await snapshot(admin, stripe);
  const newPayout = afterPayout.payouts.find((p) => !before.payouts.some((b) => b.id === p.id));
  const newStripePayouts = afterPayout.stripePayouts.filter(
    (p) => !before.stripePayouts.some((b) => b.id === p.id),
  );

  if (attempt1.payoutsCreated !== 1 || !newPayout || newPayout.amount_cents !== LIFE_CENTS) {
    report.classification = "FAIL";
    report.failReason = "payout_execution_unexpected";
    report.step8_configRestore = await setMinPayout(admin, PROD_MIN);
    report.finishedAt = new Date().toISOString();
    writeReport();
    throw new Error("STOP: payout execution did not produce exactly one 1800-cent payout");
  }

  if (newStripePayouts.length > 1 || attempt1.payoutsCreated > 1) {
    report.classification = "FAIL";
    report.failReason = "more_than_one_payout";
    report.step8_configRestore = await setMinPayout(admin, PROD_MIN);
    writeReport();
    throw new Error("STOP: more than one payout created");
  }

  // STEP 4 — Verify Stripe payout
  let stripePayout: Stripe.Payout | null = null;
  if (newPayout.stripe_payout_id) {
    stripePayout = await stripe.payouts.retrieve(newPayout.stripe_payout_id as string, {
      stripeAccount: CONNECT,
    });
  }

  report.step4_stripePayout = {
    livemode: stripePayout?.livemode ?? afterPayout.bal.livemode,
    amount: stripePayout?.amount,
    currency: stripePayout?.currency,
    status: stripePayout?.status,
    stripePayoutId: stripePayout?.id,
    destination: stripePayout?.destination,
    metadata: stripePayout?.metadata,
    idempotencyKey: newPayout.idempotency_key,
    lcPayoutId: newPayout.id,
    newStripePayoutCount: newStripePayouts.length,
    amountOk: stripePayout?.amount === LIFE_CENTS,
    currencyOk: stripePayout?.currency === "usd",
  };

  // STEP 5 — Verify LC accounting
  const newLedgerEntries = afterPayout.ledger.filter((e) => !before.ledger.some((b) => b.id === e.id));
  report.step5_liveCircuitAccounting = {
    lifeBefore: {
      artist_payout_status: before.life?.artist_payout_status,
      remaining_artist_earnings_cents: before.life?.remaining_artist_earnings_cents,
    },
    lifeAfter: {
      artist_payout_status: afterPayout.life?.artist_payout_status,
      remaining_artist_earnings_cents: afterPayout.life?.remaining_artist_earnings_cents,
    },
    lcBefore: {
      available_cents: before.lc?.available_cents,
      pending_cents: before.lc?.pending_cents,
      lifetime_paid_out_cents: before.lc?.lifetime_paid_out_cents,
    },
    lcAfter: {
      available_cents: afterPayout.lc?.available_cents,
      pending_cents: afterPayout.lc?.pending_cents,
      lifetime_paid_out_cents: afterPayout.lc?.lifetime_paid_out_cents,
    },
    artistPayoutRow: newPayout,
    artistPayoutOrders: newPayout.artist_payout_orders,
    newPayoutLedgerEntries: newLedgerEntries,
    pendingUnchanged: before.lc?.pending_cents === afterPayout.lc?.pending_cents,
    availableDecreasedBy1800:
      Number(before.lc?.available_cents) - Number(afterPayout.lc?.available_cents) === LIFE_CENTS,
    lifetimeIncreasedBy1800:
      Number(afterPayout.lc?.lifetime_paid_out_cents) - Number(before.lc?.lifetime_paid_out_cents) ===
      LIFE_CENTS,
    negativeBalance: Number(afterPayout.lc?.available_cents) < 0,
  };

  // STEP 6 — Webhooks
  await sleep(5000);
  const { data: whEvents } = await admin
    .from("monetization_stripe_webhook_events")
    .select("*")
    .in("event_type", ["payout.created", "payout.paid", "payout.failed", "payout.updated", "payout.canceled"])
    .order("processed_at", { ascending: false })
    .limit(40);

  const payoutWebhooks = (whEvents ?? []).filter((e) => {
    const obj = (e.payload as { data?: { object?: { id?: string; metadata?: Record<string, string> } } })
      ?.data?.object;
    return (
      obj?.id === newPayout.stripe_payout_id ||
      obj?.metadata?.payout_id === newPayout.id ||
      obj?.metadata?.artist_id === ARTIST_ID
    );
  });

  report.step6_webhooks = {
    events: payoutWebhooks.map((e) => ({
      stripe_event_id: e.stripe_event_id,
      event_type: e.event_type,
      status: e.status,
      processed_at: e.processed_at,
    })),
    uniqueEventIds: [...new Set(payoutWebhooks.map((e) => e.stripe_event_id))],
    processedCount: payoutWebhooks.filter((e) => e.status === "processed").length,
    lcPayoutStatus: newPayout.status,
    stripePayoutStatus: stripePayout?.status,
  };

  // STEP 7 — Duplicate payout test
  const attempt2 = await processEligibleArtistPayouts(admin);
  await sleep(3000);
  const afterDup = await snapshot(admin, stripe);

  if (attempt2.payoutsCreated > 0 || afterDup.payouts.length > afterPayout.payouts.length) {
    report.classification = "FAIL";
    report.failReason = "duplicate_payout_created";
    report.step7_duplicatePayout = { attempt2, afterDupPayoutCount: afterDup.payouts.length };
    report.step8_configRestore = await setMinPayout(admin, PROD_MIN);
    writeReport();
    throw new Error("STOP: duplicate payout created on second attempt");
  }

  report.step7_duplicatePayout = {
    attempt2,
    payoutsCreated: attempt2.payoutsCreated,
    payoutsSkipped: attempt2.payoutsSkipped,
    skipReasons: attempt2.skipReasons,
    artistPayoutsBefore: afterPayout.payouts.length,
    artistPayoutsAfter: afterDup.payouts.length,
    stripePayoutsBefore: afterPayout.stripePayouts.length,
    stripePayoutsAfter: afterDup.stripePayouts.length,
    ledgerBefore: afterPayout.ledger.length,
    ledgerAfter: afterDup.ledger.length,
    lcAvailableBefore: afterPayout.lc?.available_cents,
    lcAvailableAfter: afterDup.lc?.available_cents,
    lifetimeBefore: afterPayout.lc?.lifetime_paid_out_cents,
    lifetimeAfter: afterDup.lc?.lifetime_paid_out_cents,
    lifeRemainingAfter: afterDup.life?.remaining_artist_earnings_cents,
  };

  // STEP 8 — Restore production config
  const restoredConfig = await setMinPayout(admin, PROD_MIN);
  report.step8_configRestore = {
    restored: restoredConfig,
    ok:
      restoredConfig?.min_payout_cents === PROD_MIN &&
      restoredConfig?.payout_delay_days === 7 &&
      Number(restoredConfig?.reserve_percent) === 0 &&
      restoredConfig?.stripe_connect_ready === false,
  };

  // STEP 9 — Final safety reconciliation
  const protectedFinal = await verifyProtected(admin, goldenAvailableAt);
  report.step9_finalReconciliation = {
    protectedObjects: protectedFinal,
    totals: {
      artistPayoutsBefore: before.payoutCount,
      artistPayoutsAfter: afterDup.payoutCount,
      stripePayoutsBefore: before.stripePayouts.length,
      stripePayoutsAfter: afterDup.stripePayouts.length,
    },
    lifePayout: {
      lcPayoutId: newPayout.id,
      stripePayoutId: newPayout.stripe_payout_id,
      amountCents: newPayout.amount_cents,
      idempotencyKey: newPayout.idempotency_key,
      orderIds: (newPayout.artist_payout_orders as Array<{ order_id: string }> | undefined)?.map(
        (o) => o.order_id,
      ),
    },
    lc: {
      availableBefore: before.lc?.available_cents,
      availableAfter: afterDup.lc?.available_cents,
      lifetimeBefore: before.lc?.lifetime_paid_out_cents,
      lifetimeAfter: afterDup.lc?.lifetime_paid_out_cents,
      pendingBefore: before.lc?.pending_cents,
      pendingAfter: afterDup.lc?.pending_cents,
    },
    payoutLedger: {
      before: before.ledger.length,
      after: afterDup.ledger.length,
    },
    duplicateAttempt: attempt2,
    finalPayoutConfig: restoredConfig,
    stripeConnectAfter: {
      available: afterDup.stripeAvailable,
      pending: afterDup.stripePending,
    },
  };

  const stripeOk =
    stripePayout?.amount === LIFE_CENTS &&
    stripePayout.currency === "usd" &&
    !stripePayout.livemode &&
    afterDup.stripePayouts.length === before.stripePayouts.length + 1;
  const lcOk =
    Number(afterDup.lc?.available_cents) === 0 &&
    Number(afterDup.lc?.lifetime_paid_out_cents) === LIFE_CENTS &&
    Number(afterDup.life?.remaining_artist_earnings_cents) === 0 &&
    afterDup.payouts.length === 1 &&
    afterDup.ledger.length === before.ledger.length + 1 &&
    before.lc?.pending_cents === afterDup.lc?.pending_cents;
  const dupOk = attempt2.payoutsCreated === 0;
  const configOk = (report.step8_configRestore as { ok: boolean }).ok;
  const protectedOk =
    protectedFinal.goldenOk && protectedFinal.histOk && protectedFinal.freshOk;

  report.classification =
    stripeOk && lcOk && dupOk && configOk && protectedOk ? "PASS" : "FAIL";
  report.finishedAt = new Date().toISOString();
  writeReport();
  console.log(
    JSON.stringify(
      {
        classification: report.classification,
        lifePayoutId: newPayout.id,
        stripePayoutId: newPayout.stripe_payout_id,
        amountCents: newPayout.amount_cents,
        attempt1,
        attempt2,
      },
      null,
      2,
    ),
  );

  if (report.classification !== "PASS") process.exit(1);
}

main().catch((e) => {
  report.fatalError = e instanceof Error ? e.message : String(e);
  report.classification = report.classification ?? "FAIL";
  report.finishedAt = new Date().toISOString();
  writeReport();
  console.error(e);
  process.exit(1);
});
