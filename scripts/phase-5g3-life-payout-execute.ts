/**
 * Phase 5G.3 — LIFE payout execution + duplicate payout E2E.
 * Run: npx tsx -r ./scripts/preload-server-only.cjs scripts/phase-5g3-life-payout-execute.ts
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { processEligibleArtistPayouts } from "../src/lib/services/artist-payout.service";
import { getArtistConnectStatus, isArtistPayoutReady } from "../src/lib/stripe/connect";
import { getPayoutConfig } from "../src/lib/monetization/payout-config.server";

const APP_URL = "https://www.watchlivecircuit.com";
const CONNECT = "acct_1U3xwlEJwfCXyXc7";
const ARTIST_ID = "91b8850b-c145-4fa1-9167-0ba83cd329e8";
const LIFE_ORDER = "2d9d1586-10f9-4255-a47b-d962962d343b";
const GOLDEN = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const HIST_DISP = "56d3952c-43bc-4457-9a4d-e7a50deaec50";
const FRESH_DISP = "0d4e711f-970f-494d-bd54-56f18c3dbda5";
const HIST_DISPUTE = "du_1U5FPtEJwfqaexCo2K4kMbhl";
const FRESH_DISPUTE = "du_1U5GTmEJwfqaexConl1T4Yhc";

const report: Record<string, unknown> = { phase: "5G.3", startedAt: new Date().toISOString() };

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

async function snapshotPayoutState(admin: ReturnType<typeof createClient>, stripe: Stripe) {
  const [{ data: lc }, { data: life }, { data: payouts }, { data: config }] = await Promise.all([
    admin.from("artist_balances").select("*").eq("artist_id", ARTIST_ID).maybeSingle(),
    admin.from("orders").select("*").eq("id", LIFE_ORDER).single(),
    admin
      .from("artist_payouts")
      .select("*, artist_payout_orders(*)")
      .eq("artist_id", ARTIST_ID)
      .order("created_at", { ascending: true }),
    admin.from("monetization_payout_config").select("*").eq("id", "default").single(),
  ]);
  const bal = await stripe.balance.retrieve({}, { stripeAccount: CONNECT });
  const stripePayouts = await stripe.payouts.list({ limit: 20 }, { stripeAccount: CONNECT });
  const { data: ledger } = await admin
    .from("monetization_financial_ledger")
    .select("*")
    .or(`order_id.eq.${LIFE_ORDER},category.eq.payout`)
    .order("created_at", { ascending: true });
  return { lc, life, payouts: payouts ?? [], config, bal, stripePayouts: stripePayouts.data, ledger: ledger ?? [] };
}

/** Mirror processEligibleArtistPayouts allocation without side effects */
async function calculateExpectedPayout(admin: ReturnType<typeof createClient>, artistId: string) {
  const config = await getPayoutConfig(admin);
  const { data: row } = await admin
    .from("artist_balances")
    .select("available_cents")
    .eq("artist_id", artistId)
    .maybeSingle();
  const availableCents = Number(row?.available_cents ?? 0);
  if (availableCents < config.minPayoutCents) {
    return { wouldSkip: true, reason: "below_min_payout", availableCents, minPayoutCents: config.minPayoutCents, payoutAmount: 0, selectedOrders: [] as Array<{ orderId: string; amountCents: number }>, idempotencyKey: null };
  }
  const { data: orders } = await admin
    .from("orders")
    .select("id, remaining_artist_earnings_cents, artist_earnings_cents")
    .eq("artist_id", artistId)
    .eq("artist_payout_status", "available")
    .eq("status", "paid")
    .order("available_at", { ascending: true });
  const orderAllocations = (orders ?? [])
    .map((o) => ({
      orderId: o.id as string,
      amountCents: Number(o.remaining_artist_earnings_cents ?? o.artist_earnings_cents ?? 0),
    }))
    .filter((o) => o.amountCents > 0);
  const allocTotal = orderAllocations.reduce((s, o) => s + o.amountCents, 0);
  const payoutAmount = Math.min(availableCents, allocTotal);
  if (payoutAmount < config.minPayoutCents) {
    return { wouldSkip: true, reason: "allocation_below_min", availableCents, minPayoutCents: config.minPayoutCents, payoutAmount, selectedOrders: [], idempotencyKey: null };
  }
  let running = 0;
  const selectedOrders: Array<{ orderId: string; amountCents: number }> = [];
  for (const alloc of orderAllocations) {
    if (running >= payoutAmount) break;
    const take = Math.min(alloc.amountCents, payoutAmount - running);
    if (take <= 0) continue;
    selectedOrders.push({ orderId: alloc.orderId, amountCents: take });
    running += take;
  }
  const idempotencyKey = `payout:${artistId}:${payoutAmount}:${selectedOrders.map((o) => o.orderId).join(",")}`;
  return { wouldSkip: false, reason: null, availableCents, minPayoutCents: config.minPayoutCents, payoutAmount, selectedOrders, idempotencyKey };
}

async function verifyProtected(admin: ReturnType<typeof createClient>) {
  const [{ data: golden }, { data: hist }, { data: fresh }, { data: hd }, { data: fd }] = await Promise.all([
    admin.from("orders").select("status, artist_payout_status, refund_cents").eq("id", GOLDEN).single(),
    admin.from("orders").select("artist_payout_status").eq("id", HIST_DISP).single(),
    admin.from("orders").select("artist_payout_status").eq("id", FRESH_DISP).single(),
    admin.from("artist_disputes").select("metadata").eq("stripe_dispute_id", HIST_DISPUTE).maybeSingle(),
    admin.from("artist_disputes").select("metadata").eq("stripe_dispute_id", FRESH_DISPUTE).maybeSingle(),
  ]);
  return {
    goldenOk: golden?.status === "paid" && golden?.artist_payout_status === "pending" && Number(golden?.refund_cents) === 0,
    histOk: hist?.artist_payout_status === "held" && (hd?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800,
    freshOk: fresh?.artist_payout_status === "held" && (fd?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800,
    golden,
    hist,
    fresh,
  };
}

async function main() {
  const sk = loadStripeKey();
  const creds = loadServiceKey();
  process.env.STRIPE_SECRET_KEY = sk;
  process.env.SUPABASE_SERVICE_ROLE_KEY = creds.key;
  process.env.NEXT_PUBLIC_SUPABASE_URL = creds.url;

  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  // STEP 0
  const healthRes = await fetch(`${APP_URL}/api/health`);
  const health = { status: healthRes.status, body: await healthRes.json() };
  const before = await snapshotPayoutState(admin, stripe);
  const stripeAvailable = before.bal.available.find((b) => b.currency === "usd")?.amount ?? 0;
  const { status: connectStatus } = await getArtistConnectStatus(admin, ARTIST_ID);
  const payoutReady = isArtistPayoutReady(connectStatus, (await getArtistConnectStatus(admin, ARTIST_ID)).record);
  const expected = await calculateExpectedPayout(admin, ARTIST_ID);

  report.step0 = {
    health,
    stripeLivemode: before.bal.livemode,
    connectAccount: CONNECT,
    payoutConfig: before.config,
    lifeOrder: {
      id: before.life?.id,
      status: before.life?.status,
      artist_payout_status: before.life?.artist_payout_status,
      remaining_artist_earnings_cents: before.life?.remaining_artist_earnings_cents,
    },
    lcAvailable: before.lc?.available_cents,
    existingPayoutCount: before.payouts.length,
    stripeAvailableCents: stripeAvailable,
    stripePendingCents: before.bal.pending.find((b) => b.currency === "usd")?.amount ?? 0,
    payoutReady,
    protectedBefore: await verifyProtected(admin),
  };

  const configOk =
    before.config?.payout_delay_days === 7 &&
    before.config?.min_payout_cents === 2500 &&
    Number(before.config?.reserve_percent) === 0 &&
    before.config?.stripe_connect_ready === false;

  const preflightFail: string[] = [];
  if (health.body?.status !== "ok") preflightFail.push("health_not_ok");
  if (before.bal.livemode) preflightFail.push("not_test_mode");
  if (!configOk) preflightFail.push("payout_config_changed");
  if (before.life?.status !== "paid" || before.life?.artist_payout_status !== "available") preflightFail.push("life_order_not_available");
  if (Number(before.life?.remaining_artist_earnings_cents) !== 1800) preflightFail.push("life_remaining_not_1800");
  if (expected.wouldSkip) preflightFail.push(`allocation_logic_would_skip:${expected.reason}`);
  if (stripeAvailable < expected.payoutAmount) preflightFail.push("stripe_available_insufficient");

  report.step1 = { expectedAllocation: expected };

  if (preflightFail.length > 0) {
    report.result = "BLOCKED";
    report.blockedReasons = preflightFail;
    report.protectedAfter = await verifyProtected(admin);
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(process.cwd(), "scripts", "phase-5g3-life-payout-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ result: "BLOCKED", blockedReasons: preflightFail, expected, stripeAvailable, lcAvailable: before.lc?.available_cents }, null, 2));
    return;
  }

  // STEP 2 — execute
  report.before = {
    lcAvailable: before.lc?.available_cents,
    lifetimePaidOut: before.lc?.lifetime_paid_out_cents,
    payoutCount: before.payouts.length,
    stripeAvailable,
    lifeStatus: before.life?.artist_payout_status,
  };

  report.step2 = { payoutAttempt1: await processEligibleArtistPayouts(admin) };
  await sleep(10000);

  const mid = await snapshotPayoutState(admin, stripe);
  const newPayout = mid.payouts.find((p) => !before.payouts.some((b) => b.id === p.id));

  if ((report.step2 as { payoutAttempt1: { payoutsCreated: number } }).payoutAttempt1.payoutsCreated > 1) {
    report.result = "FAIL";
    report.failReason = "more_than_one_payout_created";
    writeFileSync(join(process.cwd(), "scripts", "phase-5g3-life-payout-report.json"), JSON.stringify(report, null, 2));
    throw new Error("STOP: more than one payout created");
  }

  let stripePayoutObj: Stripe.Payout | null = null;
  if (newPayout?.stripe_payout_id) {
    stripePayoutObj = await stripe.payouts.retrieve(newPayout.stripe_payout_id as string, {
      stripeAccount: CONNECT,
    });
  }

  report.step3 = {
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
    payoutsCreated: (report.step2 as { payoutAttempt1: { payoutsCreated: number } }).payoutAttempt1.payoutsCreated,
  };

  report.step4 = {
    lcBefore: before.lc,
    lcAfter: mid.lc,
    lifeBefore: { artist_payout_status: before.life?.artist_payout_status, remaining: before.life?.remaining_artist_earnings_cents },
    lifeAfter: { artist_payout_status: mid.life?.artist_payout_status, remaining: mid.life?.remaining_artist_earnings_cents },
    artistPayoutRow: newPayout,
    payoutLedger: mid.ledger.filter((e) => String(e.entry_type).includes("payout") || e.category === "payout"),
  };

  // STEP 5 webhooks
  await sleep(5000);
  const { data: wh } = await admin
    .from("monetization_stripe_webhook_events")
    .select("*")
    .in("event_type", ["payout.created", "payout.paid", "payout.failed", "payout.canceled"])
    .order("processed_at", { ascending: false })
    .limit(20);
  report.step5 = {
    payoutWebhooks: (wh ?? []).filter((e) => {
      const obj = (e.payload as { data?: { object?: { id?: string; metadata?: { payout_id?: string } } } })?.data?.object;
      return obj?.id === newPayout?.stripe_payout_id || obj?.metadata?.payout_id === newPayout?.id;
    }),
  };

  // STEP 6 duplicate
  const lcBeforeDup = mid.lc;
  report.step6 = { payoutAttempt2: await processEligibleArtistPayouts(admin) };
  await sleep(3000);
  const after = await snapshotPayoutState(admin, stripe);

  report.step6Verification = {
    payoutCountBeforeDup: mid.payouts.length,
    payoutCountAfterDup: after.payouts.length,
    stripePayoutCount: after.stripePayouts.length,
    lcAvailableBeforeDup: lcBeforeDup?.available_cents,
    lcAvailableAfterDup: after.lc?.available_cents,
    lifetimeBeforeDup: lcBeforeDup?.lifetime_paid_out_cents,
    lifetimeAfterDup: after.lc?.lifetime_paid_out_cents,
  };

  report.step7 = {
    stripe: {
      payoutId: stripePayoutObj?.id,
      amount: stripePayoutObj?.amount,
      status: stripePayoutObj?.status,
      payoutCount: after.stripePayouts.length,
      connectAvailableBefore: stripeAvailable,
      connectAvailableAfter: after.bal.available.find((b) => b.currency === "usd")?.amount ?? 0,
    },
    liveCircuit: {
      availableBefore: before.lc?.available_cents,
      availableAfter: after.lc?.available_cents,
      lifetimeBefore: before.lc?.lifetime_paid_out_cents,
      lifetimeAfter: after.lc?.lifetime_paid_out_cents,
      payoutRowsBefore: before.payouts.length,
      payoutRowsAfter: after.payouts.length,
    },
  };

  report.step8 = { protectedAfter: await verifyProtected(admin) };

  const created = (report.step2 as { payoutAttempt1: { payoutsCreated: number } }).payoutAttempt1.payoutsCreated === 1;
  const dupOk = (report.step6 as { payoutAttempt2: { payoutsCreated: number } }).payoutAttempt2.payoutsCreated === 0;
  const amountOk = newPayout?.amount_cents === expected.payoutAmount;
  const protectedOk = Object.values(report.step8.protectedAfter as Record<string, boolean>).every((v) => v !== false);

  report.result = created && dupOk && amountOk && protectedOk ? "PASS" : "FAIL";
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(process.cwd(), "scripts", "phase-5g3-life-payout-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ result: report.result, step2: report.step2, step6: report.step6 }, null, 2));
}

main().catch((e) => {
  report.fatalError = e instanceof Error ? e.message : String(e);
  report.result = report.result ?? "FAIL";
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(process.cwd(), "scripts", "phase-5g3-life-payout-report.json"), JSON.stringify(report, null, 2));
  console.error(e);
  process.exit(1);
});
