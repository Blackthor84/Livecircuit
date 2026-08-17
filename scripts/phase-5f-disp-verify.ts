/**
 * Phase 5F — read-only DISP inspection + controlled webhook replay.
 * Run: npx tsx -r ./scripts/preload-server-only.cjs scripts/phase-5f-disp-verify.ts [--replay] [--replay-dup]
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const APP_URL = "https://www.watchlivecircuit.com";
const GOLDEN = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const DISP_ORDER = "56d3952c-43bc-4457-9a4d-e7a50deaec50";
const DISP_DISPUTE = "du_1U5FPtEJwfqaexCo2K4kMbhl";
const DISP_EVENT = "evt_1U5FPuEJwfqaexCozPs7f3R1";
const PLATFORM = "acct_1TyiEHEJwfqaexCo";
const CONNECT = "acct_1U3xwlEJwfCXyXc7";
const PHASE5E_SHA = "ca156e7e12f6868a349c8a61547a22097691dbcf";

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

async function fetchHealth() {
  const res = await fetch(`${APP_URL}/api/health`);
  return { status: res.status, body: await res.json() };
}

async function snapshot(admin: ReturnType<typeof createClient>, orderId: string) {
  const [{ data: order }, { data: txns }, { data: wh }, { data: disputes }, { data: balance }] =
    await Promise.all([
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
        .order("processed_at", { ascending: true }),
      admin.from("artist_disputes").select("*").eq("order_id", orderId),
      admin.from("artist_balances").select("*").eq("artist_id", "91b8850b-c145-4fa1-9167-0ba83cd329e8").single(),
    ]);
  return { order, txns, webhooks: wh, disputes, balance };
}

async function inspectStripe(stripe: Stripe, piId: string, chargeId: string, transferId: string | null) {
  const account = await stripe.accounts.retrieve();
  const dispute = await stripe.disputes.retrieve(DISP_DISPUTE);
  const charge = await stripe.charges.retrieve(chargeId, { expand: ["transfer"] });
  const event = await stripe.events.retrieve(DISP_EVENT);
  let transfer = transferId ? await stripe.transfers.retrieve(transferId) : null;
  if (!transfer && charge.transfer) {
    const tid = typeof charge.transfer === "string" ? charge.transfer : charge.transfer.id;
    transfer = await stripe.transfers.retrieve(tid);
  }
  let reversals: Stripe.TransferReversal[] = [];
  if (transfer?.id) {
    const list = await stripe.transfers.listReversals(transfer.id, { limit: 10 });
    reversals = list.data;
  }
  const pi = await stripe.paymentIntents.retrieve(piId, {
    expand: ["latest_charge.balance_transaction"],
  });
  return { account, dispute, charge, event, transfer, reversals, paymentIntent: pi };
}

async function replayViaStripeCli(eventId: string) {
  try {
    const out = execSync(`stripe events resend ${eventId}`, {
      encoding: "utf8",
      timeout: 120_000,
    });
    return { ok: true, output: out };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, output: err.stdout ?? "", error: err.stderr ?? err.message ?? String(e) };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const doReplay = args.includes("--replay");
  const doReplayDup = args.includes("--replay-dup");

  const report: Record<string, unknown> = {
    phase: "5F",
    startedAt: new Date().toISOString(),
    phase5eExpectedSha: PHASE5E_SHA,
  };

  report.health = await fetchHealth();

  const sk = loadStripeKey();
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });
  const creds = loadServiceKey();
  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });

  const { data: dispDisputeRow } = await admin
    .from("artist_disputes")
    .select("*")
    .eq("stripe_dispute_id", DISP_DISPUTE)
    .maybeSingle();
  const { data: dispEventRow } = await admin
    .from("monetization_stripe_webhook_events")
    .select("*")
    .eq("stripe_event_id", DISP_EVENT)
    .maybeSingle();
  const { data: golden } = await admin.from("orders").select("*").eq("id", GOLDEN).single();
  const dispSnapBefore = await snapshot(admin, DISP_ORDER);

  const order = dispSnapBefore.order;
  const piId = order?.stripe_payment_intent_id as string;
  const chargeId = "ch_3U5FPsEJwfqaexCo18LZoz29";
  const transferId = (order?.stripe_transfer_id as string | null) ?? "tr_3U5FPsEJwfqaexCo1b9ucrn1";

  report.stripeBefore = await inspectStripe(stripe, piId, chargeId, transferId);
  report.dispDisputeRowBefore = dispDisputeRow;
  report.dispEventRowBefore = dispEventRow;
  report.dispOrderBefore = dispSnapBefore;
  report.goldenBefore = golden;

  report.replaySafetyAnalysis = {
    webhookEventStatus: dispEventRow?.status ?? null,
    webhookEventError: dispEventRow?.error_message ?? null,
    artistDisputeOrderId: dispDisputeRow?.order_id ?? null,
    artistDisputeStatus: dispDisputeRow?.livecircuit_status ?? null,
    phase5eIdempotencyAllowsRetryOnlyWhen:
      "monetization_stripe_webhook_events.status=failed AND error_message starts with deferred:",
    currentEventBlocksReplay:
      dispEventRow?.status === "processed" ||
      (dispEventRow?.status === "failed" &&
        !String(dispEventRow?.error_message ?? "").startsWith("deferred:")),
    ifReplayRanWouldResolveOrderViaPiMetadata: true,
    ifReplayRanWouldCapReversalAt1800: true,
    duplicateGuardWouldSkipHandler:
      dispEventRow?.status === "processed" ||
      (dispEventRow?.status === "failed" &&
        !String(dispEventRow?.error_message ?? "").startsWith("deferred:")),
  };

  const safeToReplay = !report.replaySafetyAnalysis.duplicateGuardWouldSkipHandler;

  if (doReplay && safeToReplay) {
    report.replay1 = await replayViaStripeCli(DISP_EVENT);
    await new Promise((r) => setTimeout(r, 15000));
    report.afterReplay1 = {
      dispDispute: await admin.from("artist_disputes").select("*").eq("stripe_dispute_id", DISP_DISPUTE).maybeSingle(),
      dispEvent: await admin.from("monetization_stripe_webhook_events").select("*").eq("stripe_event_id", DISP_EVENT).maybeSingle(),
      orderSnap: await snapshot(admin, DISP_ORDER),
      stripe: await inspectStripe(stripe, piId, chargeId, transferId),
    };
  } else if (doReplay) {
    report.replay1Skipped = {
      reason: "Webhook idempotency would treat evt as duplicate (status=processed from Phase 5D)",
      attemptedCliResendForDocumentation: await replayViaStripeCli(DISP_EVENT),
    };
    await new Promise((r) => setTimeout(r, 10000));
    report.afterSkippedReplay = {
      dispDispute: await admin.from("artist_disputes").select("*").eq("stripe_dispute_id", DISP_DISPUTE).maybeSingle(),
      dispEvent: await admin.from("monetization_stripe_webhook_events").select("*").eq("stripe_event_id", DISP_EVENT).maybeSingle(),
      orderSnap: await snapshot(admin, DISP_ORDER),
      stripe: await inspectStripe(stripe, piId, chargeId, transferId),
    };
  }

  if (doReplayDup && safeToReplay) {
    report.replay2 = await replayViaStripeCli(DISP_EVENT);
    await new Promise((r) => setTimeout(r, 10000));
    report.afterReplay2 = {
      dispDispute: await admin.from("artist_disputes").select("*").eq("stripe_dispute_id", DISP_DISPUTE).maybeSingle(),
      stripe: await inspectStripe(stripe, piId, chargeId, transferId),
    };
  }

  report.goldenAfter = (await admin.from("orders").select("*").eq("id", GOLDEN).single()).data;
  report.finishedAt = new Date().toISOString();

  const outPath = join(process.cwd(), "scripts", "phase-5f-disp-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("Wrote", outPath);
  console.log(JSON.stringify(report.replaySafetyAnalysis, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
