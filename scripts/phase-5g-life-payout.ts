/**
 * Phase 5G — LIFE payout + duplicate payout E2E (existing order only).
 * Run: npx tsx -r ./scripts/preload-server-only.cjs scripts/phase-5g-life-payout.ts
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { processEligibleArtistPayouts } from "../src/lib/services/artist-payout.service";
import { getArtistConnectStatus, isArtistPayoutReady } from "../src/lib/stripe/connect";

const LIFE_ORDER_ID = "2d9d1586-10f9-4255-a47b-d962962d343b";
const LIFE_PI = "pi_3U5FBBEJwfqaexCo0rh1Wp7p";
const ARTIST_ID = "91b8850b-c145-4fa1-9167-0ba83cd329e8";
const CONNECTED_ACCOUNT = "acct_1U3xwlEJwfCXyXc7";
const EXPECTED_PAYOUT = 1800;

const GOLDEN = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const HIST_DISP = "56d3952c-43bc-4457-9a4d-e7a50deaec50";
const FRESH_DISP = "0d4e711f-970f-494d-bd54-56f18c3dbda5";

const report: Record<string, unknown> = {
  phase: "5G",
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

async function snapshotSafety(admin: ReturnType<typeof createClient>) {
  const [{ data: golden }, { data: hist }, { data: fresh }] = await Promise.all([
    admin.from("orders").select("id, status, artist_payout_status, refund_cents, updated_at").eq("id", GOLDEN).single(),
    admin.from("orders").select("id, status, artist_payout_status, refund_cents, updated_at").eq("id", HIST_DISP).single(),
    admin.from("orders").select("id, status, artist_payout_status, refund_cents, updated_at").eq("id", FRESH_DISP).single(),
  ]);
  return { golden, hist, fresh, baseline: report.safetyBaseline };
}

async function main() {
  const sk = loadStripeKey();
  if (sk.startsWith("sk_live_")) throw new Error("Refusing live Stripe key");

  const creds = loadServiceKey();
  process.env.STRIPE_SECRET_KEY = sk;
  process.env.SUPABASE_SERVICE_ROLE_KEY = creds.key;
  process.env.NEXT_PUBLIC_SUPABASE_URL = creds.url;

  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  report.safetyBaseline = await snapshotSafety(admin);

  const stripeBal = await stripe.balance.retrieve({}, { stripeAccount: CONNECTED_ACCOUNT });
  const stripeAvailableUsd =
    stripeBal.available.find((b) => b.currency === "usd")?.amount ?? 0;
  const stripePendingUsd = stripeBal.pending.find((b) => b.currency === "usd")?.amount ?? 0;
  const stripeInstantUsd =
    stripeBal.instant_available?.find((b) => b.currency === "usd")?.amount ?? null;

  const { data: lifeOrder } = await admin.from("orders").select("*").eq("id", LIFE_ORDER_ID).single();
  const { data: lcBalance } = await admin.from("artist_balances").select("*").eq("artist_id", ARTIST_ID).maybeSingle();
  const { data: existingPayouts } = await admin
    .from("artist_payouts")
    .select("*, artist_payout_orders(*)")
    .eq("artist_id", ARTIST_ID)
    .order("created_at", { ascending: false });

  const lifeAllocation = (existingPayouts ?? []).flatMap((p) =>
    ((p.artist_payout_orders as Array<{ order_id: string; amount_cents: number }>) ?? []).filter(
      (o) => o.order_id === LIFE_ORDER_ID,
    ),
  );

  report.step1 = {
    stripeConnect: {
      account: CONNECTED_ACCOUNT,
      availableUsd: stripeAvailableUsd,
      pendingUsd: stripePendingUsd,
      instantAvailableUsd: stripeInstantUsd,
      livemode: stripeBal.livemode,
    },
    lifeOrder: {
      id: lifeOrder?.id,
      artist_payout_status: lifeOrder?.artist_payout_status,
      available_at: lifeOrder?.available_at,
      remaining_artist_earnings_cents: lifeOrder?.remaining_artist_earnings_cents,
      artist_earnings_cents: lifeOrder?.artist_earnings_cents,
    },
    lcBalance: {
      available_cents: lcBalance?.available_cents,
      pending_cents: lcBalance?.pending_cents,
      lifetime_paid_out_cents: lcBalance?.lifetime_paid_out_cents,
    },
    existingPayoutCount: existingPayouts?.length ?? 0,
    existingLifePayoutAllocations: lifeAllocation,
  };

  const { status: connectStatus, record: connectRecord } = await getArtistConnectStatus(admin, ARTIST_ID);
  const payoutReady = isArtistPayoutReady(connectStatus, connectRecord);
  const lcAvailable = Number(lcBalance?.available_cents ?? 0);

  const eligibility = {
    lcAvailableGte1800: lcAvailable >= EXPECTED_PAYOUT,
    stripeAvailableGte1800: stripeAvailableUsd >= EXPECTED_PAYOUT,
    payoutReady,
    lifeStatusAvailable: lifeOrder?.artist_payout_status === "available",
    eligible:
      lcAvailable >= EXPECTED_PAYOUT &&
      stripeAvailableUsd >= EXPECTED_PAYOUT &&
      payoutReady &&
      lifeOrder?.artist_payout_status === "available",
  };

  report.step2 = {
    eligibility,
    connectStatus,
    skipReason: !eligibility.eligible
      ? !eligibility.stripeAvailableGte1800
        ? "stripe_balance_not_available"
        : !eligibility.lcAvailableGte1800
          ? "lc_available_below_1800"
          : !eligibility.payoutReady
            ? "connect_not_ready"
            : !eligibility.lifeStatusAvailable
              ? "life_order_not_available"
              : "unknown"
      : null,
  };

  if (!eligibility.eligible) {
    report.stopped = "Payout eligibility not met — settlement guard";
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(process.cwd(), "scripts", "phase-5g-life-payout-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  const lcBefore = { ...lcBalance };
  const lifeBefore = { ...lifeOrder };
  const payoutCountBefore = (existingPayouts ?? []).length;

  report.step3 = { payoutAttempt1: await processEligibleArtistPayouts(admin) };
  await sleep(8000);

  const { data: payoutsAfter1 } = await admin
    .from("artist_payouts")
    .select("*, artist_payout_orders(*)")
    .eq("artist_id", ARTIST_ID)
    .order("created_at", { ascending: false });

  const newPayout = (payoutsAfter1 ?? []).find(
    (p) => !existingPayouts?.some((e) => e.id === p.id),
  ) ?? payoutsAfter1?.[0];

  let stripePayoutObj: Stripe.Payout | null = null;
  if (newPayout?.stripe_payout_id) {
    stripePayoutObj = await stripe.payouts.retrieve(newPayout.stripe_payout_id as string, {
      stripeAccount: CONNECTED_ACCOUNT,
    });
  }

  const { data: lifeAfter1 } = await admin.from("orders").select("*").eq("id", LIFE_ORDER_ID).single();
  const { data: lcAfter1 } = await admin.from("artist_balances").select("*").eq("artist_id", ARTIST_ID).maybeSingle();
  const { data: ledgerAfter1 } = await admin
    .from("monetization_financial_ledger")
    .select("*")
    .eq("order_id", LIFE_ORDER_ID)
    .order("created_at", { ascending: true });

  if ((report.step3 as { payoutAttempt1: { payoutsCreated: number } }).payoutAttempt1.payoutsCreated > 1) {
    report.stopped = "More than one payout created on first attempt";
    throw new Error("STOP: multiple payouts created");
  }

  if (Number(lcAfter1?.available_cents ?? 0) < 0) {
    report.stopped = "Negative LC balance after payout attempt";
    throw new Error("STOP: negative balance");
  }

  report.step4 = {
    payoutCreated: (report.step3 as { payoutAttempt1: { payoutsCreated: number } }).payoutAttempt1.payoutsCreated,
    artistPayoutRow: newPayout,
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
    lifeOrderAfter: {
      artist_payout_status: lifeAfter1?.artist_payout_status,
      remaining_artist_earnings_cents: lifeAfter1?.remaining_artist_earnings_cents,
    },
    lcBefore: {
      available_cents: lcBefore?.available_cents,
      lifetime_paid_out_cents: lcBefore?.lifetime_paid_out_cents,
    },
    lcAfter: {
      available_cents: lcAfter1?.available_cents,
      lifetime_paid_out_cents: lcAfter1?.lifetime_paid_out_cents,
    },
    ledgerEntries: ledgerAfter1,
    payoutLedgerEntries: (ledgerAfter1 ?? []).filter((e) => String(e.entry_type).includes("payout")),
  };

  if ((report.step3 as { payoutAttempt1: { payoutsCreated: number } }).payoutAttempt1.payoutsCreated === 1) {
    if (newPayout?.amount_cents !== EXPECTED_PAYOUT) {
      report.stopped = `Payout amount ${newPayout?.amount_cents} !== ${EXPECTED_PAYOUT}`;
      throw new Error(report.stopped as string);
    }
  }

  report.step5 = { payoutAttempt2: await processEligibleArtistPayouts(admin) };
  await sleep(5000);

  const { data: payoutsFinal } = await admin
    .from("artist_payouts")
    .select("*, artist_payout_orders(*)")
    .eq("artist_id", ARTIST_ID)
    .order("created_at", { ascending: false });

  const lifePayouts = (payoutsFinal ?? []).filter((p) =>
    ((p.artist_payout_orders as Array<{ order_id: string }>) ?? []).some((o) => o.order_id === LIFE_ORDER_ID),
  );

  const stripePayoutList = await stripe.payouts.list({ limit: 20 }, { stripeAccount: CONNECTED_ACCOUNT });
  const lifeStripePayouts = stripePayoutList.data.filter(
    (p) => p.metadata?.payout_id && lifePayouts.some((lp) => lp.id === p.metadata?.payout_id),
  );

  report.step5Verification = {
    duplicateAttempt: report.step5,
    totalLcPayoutRecords: payoutsFinal?.length ?? 0,
    lifeLcPayoutRecords: lifePayouts.length,
    newPayoutsSinceStart: (payoutsFinal?.length ?? 0) - payoutCountBefore,
    stripePayoutCountForLife: lifeStripePayouts.length || (newPayout ? 1 : 0),
  };

  // Webhook events
  const payoutEventTypes = ["payout.created", "payout.paid", "payout.failed", "payout.canceled"];
  const { data: webhookEvents } = await admin
    .from("monetization_stripe_webhook_events")
    .select("*")
    .in("event_type", payoutEventTypes)
    .order("processed_at", { ascending: false })
    .limit(30);

  const relevantWebhooks = (webhookEvents ?? []).filter((e) => {
    const payload = e.payload as { data?: { object?: { id?: string; metadata?: { payout_id?: string } } } };
    const obj = payload?.data?.object;
    if (!obj) return false;
    if (newPayout?.stripe_payout_id && obj.id === newPayout.stripe_payout_id) return true;
    if (newPayout?.id && obj.metadata?.payout_id === newPayout.id) return true;
    return false;
  });

  report.step6 = {
    payoutWebhookEvents: relevantWebhooks.map((e) => ({
      stripe_event_id: e.stripe_event_id,
      event_type: e.event_type,
      status: e.status,
      order_id: e.order_id,
      error_message: e.error_message,
      processed_at: e.processed_at,
    })),
    allRecentPayoutWebhooks: (webhookEvents ?? []).slice(0, 10).map((e) => ({
      stripe_event_id: e.stripe_event_id,
      event_type: e.event_type,
      status: e.status,
    })),
  };

  const stripeBalFinal = await stripe.balance.retrieve({}, { stripeAccount: CONNECTED_ACCOUNT });
  const { data: lcFinal } = await admin.from("artist_balances").select("*").eq("artist_id", ARTIST_ID).maybeSingle();
  const { data: lifeFinal } = await admin.from("orders").select("*").eq("id", LIFE_ORDER_ID).single();

  report.step7Safety = await snapshotSafety(admin);
  report.finalReconciliation = {
    stripeAvailableUsd: stripeBalFinal.available.find((b) => b.currency === "usd")?.amount ?? 0,
    stripePendingUsd: stripeBalFinal.pending.find((b) => b.currency === "usd")?.amount ?? 0,
    lcAvailable: lcFinal?.available_cents,
    lcPending: lcFinal?.pending_cents,
    lcLifetimePaidOut: lcFinal?.lifetime_paid_out_cents,
    lifeOrderStatus: lifeFinal?.artist_payout_status,
    lifeRemainingEarnings: lifeFinal?.remaining_artist_earnings_cents,
  };

  report.summary = {
    stripeAvailableBefore: stripeAvailableUsd,
    stripePendingBefore: stripePendingUsd,
    lcAvailableBefore: lcAvailable,
    eligibility,
    payoutId: newPayout?.stripe_payout_id ?? newPayout?.id,
    payoutAmount: newPayout?.amount_cents,
    payoutStatus: newPayout?.status,
    lcAvailableAfter: lcFinal?.available_cents,
    artistPayoutRow: newPayout,
    duplicateResult: report.step5,
    finalStripePayoutCountForLife: lifePayouts.length,
    finalLcPayoutCountForLife: lifePayouts.length,
  };

  report.finishedAt = new Date().toISOString();
  writeFileSync(join(process.cwd(), "scripts", "phase-5g-life-payout-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((e) => {
  report.fatalError = e instanceof Error ? e.message : String(e);
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(process.cwd(), "scripts", "phase-5g-life-payout-report.json"), JSON.stringify(report, null, 2));
  console.error(e);
  process.exit(1);
});
