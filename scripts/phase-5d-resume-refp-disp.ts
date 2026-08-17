/**
 * Resume Phase 5D REF-P on existing paid order + DISP webhook investigation.
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  processOrderRefund,
  processRefundByPaymentIntent,
} from "../src/lib/services/refund.service";
import { processStripeWebhookEvent } from "../src/lib/monetization/stripe-webhook.service";

const REF_P_ORDER_ID = "f4c16268-8c26-4258-a83e-83d215d68a4e";
const DISP_ORDER_ID = "56d3952c-43bc-4457-9a4d-e7a50deaec50";
const DISP_DISPUTE_ID = "du_1U5FPtEJwfqaexCo2K4kMbhl";
const DISP_EVENT_ID = "evt_1U5FPuEJwfqaexCozPs7f3R1";
const ADMIN_USER_ID = "468563fc-5dd6-4728-b55b-0fa78c67136c";
const ARTIST_ID = "91b8850b-c145-4fa1-9167-0ba83cd329e8";

const report: Record<string, unknown> = { phase: "5D-resume", tests: [] as unknown[] };

function loadStripeKey() {
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) return process.env.STRIPE_SECRET_KEY;
  const toml = readFileSync(join(homedir(), ".config", "stripe", "config.toml"), "utf8");
  return toml.match(/test_mode_api_key\s*=\s*['"]([^'"]+)['"]/)?.[1]!;
}

function loadServiceKey() {
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", {
    encoding: "utf8",
  });
  const key = JSON.parse(raw).keys.find((k: { name: string }) => k.name === "service_role").api_key;
  return { url: "https://lblhjnzphvthnxulugep.supabase.co", key };
}

function record(name: string, data: Record<string, unknown>) {
  (report.tests as unknown[]).push({ name, at: new Date().toISOString(), ...data });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function snapshotOrder(admin: SupabaseClient, orderId: string) {
  const [{ data: order }, { data: txns }, { data: webhooks }] = await Promise.all([
    admin.from("orders").select("*").eq("id", orderId).single(),
    admin
      .from("artist_balance_transactions")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    admin
      .from("monetization_stripe_webhook_events")
      .select("*")
      .eq("order_id", orderId)
      .order("processed_at", { ascending: false }),
  ]);
  return { order, txns: txns ?? [], webhooks: webhooks ?? [] };
}

async function snapshotBalance(admin: SupabaseClient) {
  const { data } = await admin.from("artist_balances").select("*").eq("artist_id", ARTIST_ID).single();
  return data;
}

async function runRefP(admin: SupabaseClient, stripe: Stripe) {
  console.log("=== REF-P RESUME ===");
  const before = await snapshotOrder(admin, REF_P_ORDER_ID);
  const balanceBefore = await snapshotBalance(admin);
  const order = before.order!;
  const piId = order.stripe_payment_intent_id as string;

  const pi = await stripe.paymentIntents.retrieve(piId, {
    expand: ["latest_charge.balance_transaction", "latest_charge.transfer", "latest_charge.application_fee"],
  });
  const ch = pi.latest_charge as Stripe.Charge;
  record("REF-P-pre", {
    ok:
      order.status === "paid" &&
      order.artist_payout_status === "pending" &&
      order.gross_cents === 2000 &&
      ch.amount === 2000 &&
      ch.application_fee_amount === 200,
    orderId: REF_P_ORDER_ID,
    pi: pi.id,
    charge: ch.id,
    transfer: typeof ch.transfer === "string" ? ch.transfer : ch.transfer?.id,
    balanceBefore,
    ledger: before.txns,
  });

  const partial = await processOrderRefund(admin, {
    orderId: REF_P_ORDER_ID,
    createStripeRefund: true,
    stripeRefundAmountCents: 500,
    adminId: ADMIN_USER_ID,
    reason: "Phase 5D REF-P partial $5",
    notifyUser: false,
  });
  if (!partial.ok) throw new Error(`partial refund failed: ${partial.error}`);
  await sleep(8000);

  const afterPartial = await snapshotOrder(admin, REF_P_ORDER_ID);
  const balanceAfterPartial = await snapshotBalance(admin);
  const partialTxn = afterPartial.txns.find((t) => t.transaction_type === "partial_refund");
  const refunds = await stripe.refunds.list({ payment_intent: piId, limit: 5 });
  const partialStripe = refunds.data.find((r) => r.amount === 500);

  const partialOk =
    afterPartial.order?.refund_cents === 500 &&
    partialTxn?.artist_earnings_cents === 450 &&
    partialTxn?.platform_fee_cents === 50;
  record("REF-P-partial", {
    ok: partialOk,
    partialResult: partial,
    stripeRefundId: partialStripe?.id,
    order: afterPartial.order,
    partialTxn,
    ledger: afterPartial.txns,
    balanceBefore,
    balanceAfterPartial,
    pendingDelta: Number(balanceAfterPartial?.pending_cents) - Number(balanceBefore?.pending_cents),
  });
  if (!partialOk) throw new Error("REF-P partial verification failed");

  const idem1 = await processRefundByPaymentIntent(admin, {
    stripePaymentIntentId: piId,
    amountCents: 500,
    stripeRefundId: partialStripe?.id ?? "re_idem",
    stripeEventId: "evt_idem_partial_replay_resume",
  });
  const idem2 = await processRefundByPaymentIntent(admin, {
    stripePaymentIntentId: piId,
    amountCents: 500,
    stripeRefundId: partialStripe?.id ?? "re_idem",
    stripeEventId: "evt_idem_partial_replay_resume_2",
  });
  const afterIdem = await snapshotOrder(admin, REF_P_ORDER_ID);
  const refundTxns = afterIdem.txns.filter((t) => String(t.transaction_type).includes("refund"));
  record("REF-P-idempotency", {
    ok: idem1.ok && idem2.ok && "alreadyRefunded" in idem2 && idem2.alreadyRefunded && refundTxns.length === 1,
    idem1,
    idem2,
    refundTxnCount: refundTxns.length,
    balance: await snapshotBalance(admin),
  });
  if (refundTxns.length !== 1) throw new Error(`expected 1 refund txn, got ${refundTxns.length}`);

  const full = await processOrderRefund(admin, {
    orderId: REF_P_ORDER_ID,
    createStripeRefund: true,
    stripeRefundAmountCents: 2000,
    adminId: ADMIN_USER_ID,
    reason: "Phase 5D REF-P full remainder",
    notifyUser: false,
  });
  if (!full.ok) throw new Error(`full refund failed: ${full.error}`);
  await sleep(8000);

  const afterFull = await snapshotOrder(admin, REF_P_ORDER_ID);
  const balanceFinal = await snapshotBalance(admin);
  const allRefunds = await stripe.refunds.list({ payment_intent: piId, limit: 10 });
  record("REF-P-full", {
    ok: afterFull.order?.refund_cents === 2000 && afterFull.order?.status === "refunded",
    fullResult: full,
    order: afterFull.order,
    ledger: afterFull.txns,
    webhooks: afterFull.webhooks,
    stripeRefunds: allRefunds.data.map((r) => ({ id: r.id, amount: r.amount, status: r.status })),
    balanceFinal,
  });
  if (afterFull.order?.refund_cents !== 2000 || afterFull.order?.status !== "refunded") {
    throw new Error("REF-P full refund verification failed");
  }
}

async function runDispInvestigation(admin: SupabaseClient, stripe: Stripe) {
  console.log("=== DISP INVESTIGATION ===");
  const orderSnap = await snapshotOrder(admin, DISP_ORDER_ID);
  const transferId = "tr_3U5FPsEJwfqaexCo1b9ucrn1";
  const transfer = await stripe.transfers.retrieve(transferId);
  const dispute = await stripe.disputes.retrieve(DISP_DISPUTE_ID);
  const charge = await stripe.charges.retrieve("ch_3U5FPsEJwfqaexCo18LZoz29");

  const calculatedReversal = Math.min(
    transfer.amount,
    Math.round((transfer.amount * dispute.amount) / charge.amount),
  );

  record("DISP-transfer-audit", {
    ok: calculatedReversal <= Number(orderSnap.order?.artist_earnings_cents),
    chargeAmount: charge.amount,
    transferAmount: transfer.amount,
    artistEarningsCents: orderSnap.order?.artist_earnings_cents,
    disputeAmount: dispute.amount,
    calculatedReversalAmount: calculatedReversal,
    transferId,
    disputeId: DISP_DISPUTE_ID,
    stopped: calculatedReversal > Number(orderSnap.order?.artist_earnings_cents),
  });

  if (calculatedReversal > Number(orderSnap.order?.artist_earnings_cents)) {
    report.dispStopped = true;
    report.dispStopReason =
      `Calculated reversal ${calculatedReversal} exceeds artist earnings ${orderSnap.order?.artist_earnings_cents} because Stripe transfer amount is ${transfer.amount}`;
    return;
  }

  // Process missed webhook via production webhook handler (not a DB bypass)
  const event = await stripe.events.retrieve(DISP_EVENT_ID);
  const existing = await admin
    .from("monetization_stripe_webhook_events")
    .select("id")
    .eq("stripe_event_id", DISP_EVENT_ID)
    .maybeSingle();

  if (!existing.data) {
    await processStripeWebhookEvent(admin, stripe, event);
    await sleep(5000);
  }

  const after = await snapshotOrder(admin, DISP_ORDER_ID);
  const { data: disputeRow } = await admin
    .from("artist_disputes")
    .select("*")
    .eq("order_id", DISP_ORDER_ID)
    .maybeSingle();

  let reversal: Stripe.TransferReversal | null = null;
  if (disputeRow?.stripe_transfer_reversal_id && disputeRow?.stripe_transfer_id) {
    reversal = await stripe.transfers.retrieveReversal(
      disputeRow.stripe_transfer_id as string,
      disputeRow.stripe_transfer_reversal_id as string,
    );
  }

  record("DISP-after-webhook", {
    ok: !!disputeRow,
    disputeRow,
    order: after.order,
    ledger: after.txns,
    actualReversalAmount: reversal?.amount ?? null,
  });
}

async function main() {
  const stripeKey = loadStripeKey();
  const creds = loadServiceKey();
  process.env.STRIPE_SECRET_KEY = stripeKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = creds.key;
  process.env.NEXT_PUBLIC_SUPABASE_URL = creds.url;

  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  try {
    await runRefP(admin, stripe);
  } catch (e) {
    report.refPError = e instanceof Error ? e.message : String(e);
    console.error(e);
  }

  try {
    await runDispInvestigation(admin, stripe);
  } catch (e) {
    report.dispError = e instanceof Error ? e.message : String(e);
    console.error(e);
  }

  report.finishedAt = new Date().toISOString();
  writeFileSync(join(process.cwd(), "scripts", "phase-5d-resume-report.json"), JSON.stringify(report, null, 2));
  console.log("Report: scripts/phase-5d-resume-report.json");
}

main().catch(console.error);
