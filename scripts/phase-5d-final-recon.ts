import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { runFinancialReconciliation } from "../src/lib/services/financial-reconciliation.service";

const GOLDEN = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const LIFE = "2d9d1586-10f9-4255-a47b-d962962d343b";
const REF_P = "f4c16268-8c26-4258-a83e-83d215d68a4e";
const DISP = "56d3952c-43bc-4457-9a4d-e7a50deaec50";
const DEBUG = "6244737a-edc1-48c7-b8d5-af7f39050ce8";
const CONNECTED = "acct_1U3xwlEJwfCXyXc7";
const ARTIST = "91b8850b-c145-4fa1-9167-0ba83cd329e8";

async function main() {
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", {
    encoding: "utf8",
  });
  const key = JSON.parse(raw).keys.find((k: { name: string }) => k.name === "service_role").api_key;
  const admin = createClient("https://lblhjnzphvthnxulugep.supabase.co", key, {
    auth: { persistSession: false },
  });
  const toml = readFileSync(join(homedir(), ".config", "stripe", "config.toml"), "utf8");
  const sk = toml.match(/test_mode_api_key\s*=\s*['"]([^'"]+)['"]/)?.[1]!;
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  const orderIds = [GOLDEN, LIFE, REF_P, DISP, DEBUG];
  const orders: Record<string, unknown> = {};

  for (const id of orderIds) {
    const { data: order } = await admin.from("orders").select("*").eq("id", id).single();
    const { data: txns } = await admin
      .from("artist_balance_transactions")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true });
    const { data: wh } = await admin
      .from("monetization_stripe_webhook_events")
      .select("*")
      .eq("order_id", id)
      .order("processed_at", { ascending: true });
    const { data: disputes } = await admin.from("artist_disputes").select("*").eq("order_id", id);
    const { data: receivables } = await admin.from("artist_receivables").select("*").eq("order_id", id);

    let stripeDetail: Record<string, unknown> = {};
    if (order?.stripe_payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id, {
        expand: ["latest_charge.balance_transaction", "latest_charge.transfer", "latest_charge.application_fee"],
      });
      const ch = pi.latest_charge as Stripe.Charge;
      const refunds = await stripe.refunds.list({ payment_intent: pi.id, limit: 10 });
      const transferId =
        order.stripe_transfer_id ??
        (typeof ch.transfer === "string" ? ch.transfer : ch.transfer?.id ?? null);
      let reversals: unknown[] = [];
      if (transferId) {
        const revList = await stripe.transfers.listReversals(transferId, { limit: 10 });
        reversals = revList.data.map((r) => ({
          id: r.id,
          amount: r.amount,
          metadata: r.metadata,
        }));
      }
      stripeDetail = {
        checkoutSession: order.stripe_checkout_session_id,
        paymentIntent: pi.id,
        piStatus: pi.status,
        charge: ch.id,
        chargeStatus: ch.status,
        chargeAmount: ch.amount,
        chargeRefunded: ch.refunded,
        amountRefunded: ch.amount_refunded,
        applicationFee: ch.application_fee_amount,
        applicationFeeId:
          typeof ch.application_fee === "string" ? ch.application_fee : ch.application_fee?.id,
        destination: ch.transfer_data?.destination,
        transferId,
        transferAmount:
          typeof ch.transfer === "object" && ch.transfer ? (ch.transfer as Stripe.Transfer).amount : null,
        balanceTransactionId:
          typeof ch.balance_transaction === "string"
            ? ch.balance_transaction
            : (ch.balance_transaction as Stripe.BalanceTransaction)?.id,
        stripeFeeCents:
          typeof ch.balance_transaction === "object" && ch.balance_transaction
            ? (ch.balance_transaction as Stripe.BalanceTransaction).fee
            : null,
        disputed: ch.disputed,
        disputeId:
          typeof (ch as Stripe.Charge & { dispute?: string | null }).dispute === "string"
            ? (ch as Stripe.Charge & { dispute?: string | null }).dispute
            : null,
        refunds: refunds.data.map((r) => ({
          id: r.id,
          amount: r.amount,
          status: r.status,
          transferReversal: r.transfer_reversal,
        })),
        transferReversals: reversals,
      };
    }

    orders[id] = {
      label:
        id === GOLDEN
          ? "GOLDEN"
          : id === LIFE
            ? "LIFE"
            : id === REF_P
              ? "REF-P"
              : id === DISP
                ? "DISP"
                : "DEBUG",
      order,
      ledger: txns,
      webhooks: wh,
      disputes,
      receivables,
      stripe: stripeDetail,
    };
  }

  const { data: balance } = await admin.from("artist_balances").select("*").eq("artist_id", ARTIST).single();
  const { data: payouts } = await admin
    .from("artist_payouts")
    .select("*, artist_payout_orders(*)")
    .eq("artist_id", ARTIST)
    .order("created_at", { ascending: false });
  const { data: config } = await admin.from("monetization_payout_config").select("*").eq("id", "default").single();

  const connectBalance = await stripe.balance.retrieve({}, { stripeAccount: CONNECTED });
  const platformBalance = await stripe.balance.retrieve();

  const recon = await runFinancialReconciliation(admin);

  const report = {
    generatedAt: new Date().toISOString(),
    orders,
    artistBalance: balance,
    artistPayouts: payouts,
    payoutConfig: config,
    stripeConnectBalance: connectBalance,
    stripePlatformBalance: platformBalance,
    reconciliation: recon,
    goldenIntegrity: {
      ok:
        orders[GOLDEN] &&
        (orders[GOLDEN] as { order: { status: string } }).order?.status === "paid" &&
        (orders[GOLDEN] as { order: { artist_payout_status: string } }).order?.artist_payout_status ===
          "pending" &&
        (orders[GOLDEN] as { order: { refund_cents: number } }).order?.refund_cents === 0,
    },
  };

  writeFileSync(join(process.cwd(), "scripts", "phase-5d-final-reconciliation.json"), JSON.stringify(report, null, 2));
  console.log("Wrote scripts/phase-5d-final-reconciliation.json");
}

main().catch(console.error);
