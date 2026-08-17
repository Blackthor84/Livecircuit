/**
 * Phase 5G.8 — Stripe Connect settlement acceleration investigation (READ-ONLY + documented mechanisms).
 * Run: npx tsx scripts/phase-5g8-settlement-investigation.ts
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
const LIFE_TRANSFER_ID = "tr_3U5FBBEJwfqaexCo0IwKnDjo";
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

async function listAllBalanceTxns(stripe: Stripe, status?: "pending" | "available") {
  const items: Stripe.BalanceTransaction[] = [];
  for await (const txn of stripe.balanceTransactions.list(
    { limit: 100, ...(status ? {} : {}) },
    { stripeAccount: CONNECT },
  )) {
    if (status && txn.status !== status) continue;
    items.push(txn);
  }
  return items;
}

async function main() {
  const sk = loadStripeKey();
  const creds = loadServiceKey();
  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });
  const acctOpts = { stripeAccount: CONNECT };

  const balanceBefore = await stripe.balance.retrieve({}, acctOpts);
  const stripePayouts = await stripe.payouts.list({ limit: 20 }, acctOpts);
  const availBefore = balanceBefore.available.find((b) => b.currency === "usd")?.amount ?? 0;
  const pendBefore = balanceBefore.pending.find((b) => b.currency === "usd")?.amount ?? 0;
  const instantBefore =
    balanceBefore.instant_available?.find((b) => b.currency === "usd")?.amount ?? null;

  const allTxns = await listAllBalanceTxns(stripe);
  const pendingTxns = allTxns.filter((t) => t.status === "pending");
  const availableTxns = allTxns.filter((t) => t.status === "available");

  let lifeTransfer: Stripe.Transfer | null = null;
  let lifeTransferError: string | null = null;
  try {
    lifeTransfer = await stripe.transfers.retrieve(LIFE_TRANSFER_ID);
  } catch (e) {
    lifeTransferError = e instanceof Error ? e.message : String(e);
  }

  const transferDetails: Array<Record<string, unknown>> = [];
  for (const txn of pendingTxns) {
    let sourceDetail: Record<string, unknown> | null = null;
    if (txn.source && String(txn.source).startsWith("tr_")) {
      try {
        const tr = await stripe.transfers.retrieve(String(txn.source));
        sourceDetail = {
          id: tr.id,
          amount: tr.amount,
          destination: tr.destination,
          created: tr.created,
          livemode: tr.livemode,
          amount_reversed: tr.amount_reversed,
          source_transaction: tr.source_transaction,
          transfer_group: tr.transfer_group,
          metadata: tr.metadata,
        };
      } catch {
        sourceDetail = { retrieveError: true, source: txn.source };
      }
    }
    transferDetails.push({
      balanceTransactionId: txn.id,
      type: txn.type,
      amount: txn.amount,
      net: txn.net,
      status: txn.status,
      available_on: txn.available_on,
      created: txn.created,
      source: txn.source,
      description: txn.description,
      sourceDetail,
    });
  }

  let balanceSettings: Stripe.BalanceSettings | null = null;
  let balanceSettingsError: string | null = null;
  try {
    balanceSettings = await stripe.balanceSettings.retrieve({}, acctOpts);
  } catch (e) {
    balanceSettingsError = e instanceof Error ? e.message : String(e);
  }

  const [{ data: lc }, { data: life }, { data: config }, { count: apCount }] = await Promise.all([
    admin.from("artist_balances").select("*").eq("artist_id", ARTIST_ID).maybeSingle(),
    admin.from("orders").select("*").eq("id", LIFE_ORDER).single(),
    admin
      .from("monetization_payout_config")
      .select("payout_delay_days, min_payout_cents, reserve_percent, stripe_connect_ready")
      .eq("id", "default")
      .single(),
    admin.from("artist_payouts").select("id", { count: "exact", head: true }).eq("artist_id", ARTIST_ID),
  ]);

  const [{ data: golden }, { data: hist }, { data: fresh }, { data: hd }, { data: fd }] =
    await Promise.all([
      admin.from("orders").select("status, artist_payout_status, refund_cents, available_at").eq("id", GOLDEN).single(),
      admin.from("orders").select("artist_payout_status").eq("id", HIST_DISP).single(),
      admin.from("orders").select("artist_payout_status").eq("id", FRESH_DISP).single(),
      admin.from("artist_disputes").select("metadata").eq("stripe_dispute_id", HIST_DISPUTE).maybeSingle(),
      admin.from("artist_disputes").select("metadata").eq("stripe_dispute_id", FRESH_DISPUTE).maybeSingle(),
    ]);

  const { data: lifeOrderFull } = await admin
    .from("orders")
    .select("id, stripe_payment_intent_id, stripe_transfer_id, stripe_charge_id")
    .eq("id", LIFE_ORDER)
    .single();

  // Step 3: Document supported mechanisms (no execution of disallowed ops)
  const supportedMechanisms = {
    testClocks: {
      exists: true,
      api: "POST /v1/test_helpers/test_clocks/:id/advance",
      appliesToConnectPendingSettlement: false,
      notes:
        "Official Stripe Test Clocks advance time for Billing objects (subscriptions/invoices). They do not accelerate Connect balance pending→available settlement for existing transfer balance transactions.",
      source: "https://docs.stripe.com/api/test_clocks",
    },
    testCardBypassPending: {
      exists: true,
      cards: ["4000000000000077", "4000003720000278"],
      appliesToExistingPendingTransfers: false,
      notes:
        "Official Stripe test cards bypass pending balance for NEW charges only. Would require creating a new payment/charge — disallowed for this phase.",
      source: "https://docs.stripe.com/testing#cards",
    },
    balanceSettingsDelayOverride: {
      exists: true,
      api: "POST /v1/balance_settings (Stripe-Account header)",
      parameter: "payments[settlement_timing][delay_days_override]",
      appliesToExistingPendingBalanceTransactions: false,
      notes:
        "Official Balance Settings API controls settlement timing for future charges/transfers. It does not retroactively move existing pending balance transactions to available before their available_on timestamp.",
      source: "https://docs.stripe.com/connect/manage-payout-schedule",
      currentSettings: balanceSettings?.payments?.settlement_timing ?? null,
    },
    instantAvailable: {
      exists: true,
      observed: instantBefore,
      appliesToStandardPayoutGuard: false,
      notes:
        "Connect balance may expose instant_available while available=0. LiveCircuit processEligibleArtistPayouts() gates on balance.available, not instant_available.",
    },
    waitForAvailableOn: {
      exists: true,
      appliesToExistingPendingBalanceTransactions: true,
      notes:
        "Official mechanism: pending balance transactions become available when Stripe's clock reaches each transaction's available_on timestamp. In TEST mode there is no documented API to force-advance existing pending txn available_on dates.",
    },
  };

  // Step 4: Do NOT execute unsupported acceleration. Re-read balance (unchanged expected).
  const balanceAfter = await stripe.balance.retrieve({}, acctOpts);
  const availAfter = balanceAfter.available.find((b) => b.currency === "usd")?.amount ?? 0;
  const pendAfter = balanceAfter.pending.find((b) => b.currency === "usd")?.amount ?? 0;
  const instantAfter =
    balanceAfter.instant_available?.find((b) => b.currency === "usd")?.amount ?? null;

  const mechanismUsed = null;
  const classification =
    availAfter >= REQUIRED_CENTS ? "SETTLEMENT_READY_FOR_5G5" : "SETTLEMENT_STILL_BLOCKED";

  const report = {
    phase: "5G.8",
    investigatedAt: new Date().toISOString(),
    step1_stripeConnectBalance: {
      livemode: balanceBefore.livemode,
      available_usd_cents: availBefore,
      pending_usd_cents: pendBefore,
      instant_available_usd_cents: instantBefore,
      stripePayoutCount: stripePayouts.data.length,
      pendingBalanceTransactionIds: pendingTxns.map((t) => t.id),
      availableBalanceTransactionIds: availableTxns.map((t) => t.id),
      pendingBalanceTransactions: transferDetails,
    },
    step2_pendingFundSources: {
      lifeTransfer: lifeTransfer
        ? {
            id: lifeTransfer.id,
            amount: lifeTransfer.amount,
            destination: lifeTransfer.destination,
            created: lifeTransfer.created,
            livemode: lifeTransfer.livemode,
            amount_reversed: lifeTransfer.amount_reversed,
            source_transaction: lifeTransfer.source_transaction,
            metadata: lifeTransfer.metadata,
          }
        : { error: lifeTransferError },
      lifeOrderStripeRefs: lifeOrderFull,
      pendingTxnCount: pendingTxns.length,
      pendingTotalNet: pendingTxns.reduce((s, t) => s + t.net, 0),
    },
    step3_supportedMechanismsInvestigation: supportedMechanisms,
    step4_accelerationAttempt: {
      mechanismUsed,
      reasonNotExecuted:
        "No official Stripe TEST API exists to retroactively advance existing Connect pending balance transactions to available without creating a new payment/transfer/payout. Test Clocks and delay_days_override do not apply to existing pending txn available_on dates.",
      before: {
        available: availBefore,
        pending: pendBefore,
        instant_available: instantBefore,
        lcAvailable: lc?.available_cents,
        lifeState: {
          status: life?.status,
          artist_payout_status: life?.artist_payout_status,
          remaining_artist_earnings_cents: life?.remaining_artist_earnings_cents,
        },
        artistPayoutsCount: apCount,
        stripePayoutCount: stripePayouts.data.length,
      },
      after: {
        available: availAfter,
        pending: pendAfter,
        instant_available: instantAfter,
      },
      balanceChanged: availBefore !== availAfter || pendBefore !== pendAfter,
    },
    step5_classification: classification,
    availableMeetsThreshold: availAfter >= REQUIRED_CENTS,
    step6_safetyReconciliation: {
      golden: {
        pass:
          golden?.status === "paid" &&
          golden?.artist_payout_status === "pending" &&
          Number(golden?.refund_cents) === 0,
        actual: golden,
      },
      historicalDisp: {
        pass:
          hist?.artist_payout_status === "held" &&
          (hd?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800,
      },
      freshDisp: {
        pass:
          fresh?.artist_payout_status === "held" &&
          (fd?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800,
      },
      life: {
        pass:
          life?.status === "paid" &&
          life?.artist_payout_status === "available" &&
          Number(life?.remaining_artist_earnings_cents) === 1800,
        actual: {
          status: life?.status,
          artist_payout_status: life?.artist_payout_status,
          remaining_artist_earnings_cents: life?.remaining_artist_earnings_cents,
        },
      },
      artist_payouts_count: apCount,
      stripe_payout_count: stripePayouts.data.length,
      payoutConfig: config,
      allSafetyChecksPass:
        golden?.status === "paid" &&
        golden?.artist_payout_status === "pending" &&
        Number(golden?.refund_cents) === 0 &&
        hist?.artist_payout_status === "held" &&
        (hd?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800 &&
        fresh?.artist_payout_status === "held" &&
        (fd?.metadata as { reversal_amount_cents?: number })?.reversal_amount_cents === 1800 &&
        life?.status === "paid" &&
        life?.artist_payout_status === "available" &&
        Number(life?.remaining_artist_earnings_cents) === 1800 &&
        (apCount ?? 0) === 0 &&
        stripePayouts.data.length === 0 &&
        config?.payout_delay_days === 7 &&
        config?.min_payout_cents === 2500 &&
        Number(config?.reserve_percent) === 0 &&
        config?.stripe_connect_ready === false,
    },
    recommendations: [
      "Wait until pending balance transactions reach their available_on timestamps (earliest pending txn date drives settlement).",
      "Re-run Phase 5G.6 periodically until balance.available >= 1800.",
      "Do NOT use a new test charge (4000000000000077) during LIFE payout E2E — that would create a new payment and contaminate the controlled test state.",
      "instant_available (5400) cannot be used by processEligibleArtistPayouts(); the app correctly gates on balance.available.",
    ],
  };

  writeFileSync(
    join(process.cwd(), "scripts", "phase-5g8-settlement-investigation-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
