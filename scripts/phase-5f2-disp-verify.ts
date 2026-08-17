/**
 * Phase 5F.2 — resume verification for order created by phase-5f2-disp-e2e.ts
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const ORDER_ID = process.argv[2] ?? "0d4e711f-970f-494d-bd54-56f18c3dbda5";
const PI_ID = process.argv[3] ?? "pi_3U5GTkEJwfqaexCo0d7SDMKB";
const CHARGE_ID = process.argv[4] ?? "ch_3U5GTkEJwfqaexCo0lvZIzt4";
const TRANSFER_ID = process.argv[5] ?? "tr_3U5GTkEJwfqaexCo0huKvYHU";
const SESSION_ID = process.argv[6] ?? "cs_test_a1imafMXtApiiQ27Zh8seGC3u8UCgXV4fA42EMaFoRoaRGOmh7sf7Q4aO9";

const GOLDEN = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const HIST_ORDER = "56d3952c-43bc-4457-9a4d-e7a50deaec50";
const HIST_DISPUTE = "du_1U5FPtEJwfqaexCo2K4kMbhl";
const HIST_REVERSAL = "trr_1U5GOJEJwfqaexCoTES54ooP";
const ARTIST_ID = "91b8850b-c145-4fa1-9167-0ba83cd329e8";
const MAX_REVERSAL = 1800;

function loadStripeKey() {
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) return process.env.STRIPE_SECRET_KEY;
  const toml = readFileSync(join(homedir(), ".config", "stripe", "config.toml"), "utf8");
  return toml.match(/test_mode_api_key\s*=\s*['"]([^'"]+)['"]/)?.[1]!;
}

function loadServiceKey() {
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", { encoding: "utf8" });
  const key = JSON.parse(raw).keys.find((k: { name: string }) => k.name === "service_role").api_key;
  return { url: "https://lblhjnzphvthnxulugep.supabase.co", key };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const sk = loadStripeKey();
  const creds = loadServiceKey();
  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  const report: Record<string, unknown> = { phase: "5F.2-verify", orderId: ORDER_ID, startedAt: new Date().toISOString() };

  const { data: order } = await admin.from("orders").select("*").eq("id", ORDER_ID).single();
  const { data: txns } = await admin
    .from("artist_balance_transactions")
    .select("*")
    .eq("order_id", ORDER_ID)
    .order("created_at", { ascending: true });
  const { data: ledger } = await admin
    .from("monetization_financial_ledger")
    .select("*")
    .or(`order_id.eq.${ORDER_ID},stripe_payment_intent_id.eq.${PI_ID}`)
    .order("created_at", { ascending: true });
  const { data: webhooks } = await admin
    .from("monetization_stripe_webhook_events")
    .select("*")
    .eq("order_id", ORDER_ID)
    .order("processed_at", { ascending: true });

  report.step4 = {
    order: {
      status: order?.status,
      stripe_payment_intent_id: order?.stripe_payment_intent_id,
      stripe_checkout_session_id: order?.stripe_checkout_session_id,
      stripe_transfer_id: order?.stripe_transfer_id,
      stripe_fee_cents: order?.stripe_fee_cents,
      stripe_balance_transaction_id: order?.stripe_balance_transaction_id,
      gross_cents: order?.gross_cents,
      platform_fee_cents: order?.platform_fee_cents,
      artist_earnings_cents: order?.artist_earnings_cents,
      artist_payout_status: order?.artist_payout_status,
    },
    ticketSales: (txns ?? []).filter((t) => t.transaction_type === "ticket_sale"),
    note: "Dispute card may move payout_status to held before immediate snapshot",
  };

  // Poll for dispute resolution up to 3 min
  let disputeRow: Record<string, unknown> | null = null;
  for (let i = 0; i < 36; i++) {
    const { data } = await admin.from("artist_disputes").select("*").eq("order_id", ORDER_ID).maybeSingle();
    if (data?.stripe_dispute_id && data.order_id === ORDER_ID) {
      disputeRow = data;
      break;
    }
    const { data: byPi } = await admin
      .from("artist_disputes")
      .select("*")
      .eq("stripe_payment_intent_id", PI_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byPi?.order_id === ORDER_ID) {
      disputeRow = byPi;
      break;
    }
    await sleep(5000);
  }

  if (!disputeRow) {
    report.error = "Dispute not linked to order";
    writeFileSync("scripts/phase-5f2-disp-report.json", JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const stripeDispute = await stripe.disputes.retrieve(disputeRow.stripe_dispute_id as string);
  report.dispute = {
    id: disputeRow.stripe_dispute_id,
    amount: stripeDispute.amount,
    livemode: stripeDispute.livemode,
    row: disputeRow,
  };

  // Poll for reversal
  for (let i = 0; i < 24; i++) {
    const { data: refreshed } = await admin.from("artist_disputes").select("*").eq("order_id", ORDER_ID).maybeSingle();
    if (refreshed?.stripe_transfer_reversal_id) {
      disputeRow = refreshed;
      break;
    }
    await sleep(5000);
  }

  const transferId = (disputeRow.stripe_transfer_id as string) || TRANSFER_ID;
  const transfer = await stripe.transfers.retrieve(transferId);
  const reversals = await stripe.transfers.listReversals(transferId, { limit: 10 });
  const disputeReversals = reversals.data.filter((r) => r.metadata?.dispute_id === disputeRow!.stripe_dispute_id);

  const { data: orderAfter } = await admin.from("orders").select("*").eq("id", ORDER_ID).single();
  const { data: txnsAfter } = await admin
    .from("artist_balance_transactions")
    .select("*")
    .eq("order_id", ORDER_ID)
    .order("created_at", { ascending: true });
  const { data: ledgerAfter } = await admin
    .from("monetization_financial_ledger")
    .select("*")
    .or(`order_id.eq.${ORDER_ID},stripe_payment_intent_id.eq.${PI_ID}`)
    .order("created_at", { ascending: true });
  const { data: whAfter } = await admin
    .from("monetization_stripe_webhook_events")
    .select("*")
    .eq("order_id", ORDER_ID)
    .order("processed_at", { ascending: true });

  const disputeLedger = (ledgerAfter ?? []).filter(
    (e) => e.entry_type === "dispute" && e.stripe_event_id === disputeRow!.stripe_dispute_id,
  );
  const holdTxns = (txnsAfter ?? []).filter((t) => t.transaction_type === "dispute_hold");

  const pi = await stripe.paymentIntents.retrieve(PI_ID, {
    expand: ["latest_charge.balance_transaction", "latest_charge.application_fee"],
  });
  const charge = pi.latest_charge as Stripe.Charge;
  const bt =
    typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
  const session = await stripe.checkout.sessions.retrieve(SESSION_ID);
  const { data: artistBalance } = await admin.from("artist_balances").select("*").eq("artist_id", ARTIST_ID).maybeSingle();
  const { data: golden } = await admin.from("orders").select("id, status, artist_payout_status, refund_cents").eq("id", GOLDEN).single();
  const { data: histOrder } = await admin.from("orders").select("id, artist_payout_status, refund_cents").eq("id", HIST_ORDER).single();
  const { data: histDispute } = await admin.from("artist_disputes").select("stripe_transfer_reversal_id").eq("stripe_dispute_id", HIST_DISPUTE).maybeSingle();

  const reversalAmount =
    disputeReversals[0]?.amount ??
    (typeof disputeRow.metadata?.reversal_amount_cents === "number" ? disputeRow.metadata.reversal_amount_cents : null);

  report.results = {
    d5: {
      pass: disputeRow.order_id === ORDER_ID && disputeRow.artist_id === ARTIST_ID && disputeRow.order_id !== null,
      order_id: disputeRow.order_id,
      artist_id: disputeRow.artist_id,
      livecircuit_status: disputeRow.livecircuit_status,
    },
    hold: {
      pass: orderAfter?.artist_payout_status === "held" && holdTxns.length === 1,
      artist_payout_status: orderAfter?.artist_payout_status,
      holdCount: holdTxns.length,
    },
    d4: {
      pass:
        reversalAmount === MAX_REVERSAL &&
        transfer.amount_reversed === MAX_REVERSAL &&
        disputeReversals.length === 1 &&
        !disputeReversals.some((r) => r.amount === 2000),
      reversalAmount,
      transferAmount: transfer.amount,
      transferAmountReversed: transfer.amount_reversed,
      reversalId: disputeRow.stripe_transfer_reversal_id ?? disputeReversals[0]?.id,
      reversalCount: disputeReversals.length,
    },
    ledger: {
      pass: disputeLedger.length === 1,
      disputeLedgerCount: disputeLedger.length,
      ticketSaleCount: (txnsAfter ?? []).filter((t) => t.transaction_type === "ticket_sale").length,
    },
    duplicate: {
      disputeWebhooks: (whAfter ?? []).filter((w) => w.event_type === "charge.dispute.created"),
      reversalCount: disputeReversals.length,
      holdCount: holdTxns.length,
    },
    goldenSafety: {
      pass:
        golden?.artist_payout_status === "pending" &&
        golden?.refund_cents === 0 &&
        histOrder?.artist_payout_status === "held" &&
        histDispute?.stripe_transfer_reversal_id === HIST_REVERSAL,
      golden,
      histOrder,
      histDisputeReversal: histDispute?.stripe_transfer_reversal_id,
    },
  };

  report.summary = {
    newOrderId: ORDER_ID,
    checkoutSession: SESSION_ID,
    paymentIntent: PI_ID,
    charge: CHARGE_ID,
    transfer: transferId,
    applicationFee: charge.application_fee_amount,
    balanceTransaction: bt?.id ?? order?.stripe_balance_transaction_id,
    stripeFee: orderAfter?.stripe_fee_cents ?? bt?.fee,
    disputeId: disputeRow.stripe_dispute_id,
    disputeWebhookIds: (whAfter ?? [])
      .filter((w) => w.event_type === "charge.dispute.created")
      .map((w) => w.stripe_event_id),
    artistDisputeRow: disputeRow,
    holdTransaction: holdTxns[0] ?? null,
    transferReversalId: disputeRow.stripe_transfer_reversal_id ?? disputeReversals[0]?.id,
    reversalAmountCents: reversalAmount,
    ledgerEntries: ledgerAfter,
    artistBalance,
    sessionStatus: session.status,
    sessionPaymentStatus: session.payment_status,
  };

  report.allPass = Object.values(report.results as Record<string, { pass: boolean }>).every((r) => r.pass);
  report.finishedAt = new Date().toISOString();
  writeFileSync("scripts/phase-5f2-disp-report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.allPass) process.exit(3);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
