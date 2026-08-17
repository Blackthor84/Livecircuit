/**
 * Phase 5F.1 — controlled orphan DISP remediation (pre-check → remediate → verify → idempotency).
 * Invokes resolveOrphanedDispute (same body as resolveOrphanedDisputeAction on production).
 * Run: npx tsx -r ./scripts/preload-server-only.cjs scripts/phase-5f1-execute.ts
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
const DISP_ARTIST = "91b8850b-c145-4fa1-9167-0ba83cd329e8";
const DISP_DISPUTE_ROW = "931f46ce-01f1-441a-b1dd-c50ef96ac3f5";
const DISP_DISPUTE = "du_1U5FPtEJwfqaexCo2K4kMbhl";
const DISP_EVENT = "evt_1U5FPuEJwfqaexCozPs7f3R1";
const PI_ID = "pi_3U5FPsEJwfqaexCo1y68LFDQ";
const CHARGE_ID = "ch_3U5FPsEJwfqaexCo18LZoz29";
const TRANSFER_ID = "tr_3U5FPsEJwfqaexCo1b9ucrn1";
const MAX_REVERSAL = 1800;

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

async function inspectStripe(stripe: Stripe) {
  const dispute = await stripe.disputes.retrieve(DISP_DISPUTE);
  const transfer = await stripe.transfers.retrieve(TRANSFER_ID);
  const reversals = await stripe.transfers.listReversals(TRANSFER_ID, { limit: 20 });
  const disputeReversals = reversals.data.filter((r) => r.metadata?.dispute_id === DISP_DISPUTE);
  return { dispute, transfer, reversals: reversals.data, disputeReversals };
}

async function inspectLc(admin: ReturnType<typeof createClient>) {
  const [
    { data: disputeRow },
    { data: order },
    { data: webhook },
    { data: ledger },
    { data: golden },
    { data: holdTxns },
  ] = await Promise.all([
    admin.from("artist_disputes").select("*").eq("id", DISP_DISPUTE_ROW).maybeSingle(),
    admin.from("orders").select("*").eq("id", DISP_ORDER).maybeSingle(),
    admin
      .from("monetization_stripe_webhook_events")
      .select("*")
      .eq("stripe_event_id", DISP_EVENT)
      .maybeSingle(),
    admin
      .from("monetization_financial_ledger")
      .select("*")
      .eq("stripe_event_id", DISP_DISPUTE)
      .eq("entry_type", "dispute"),
    admin.from("orders").select("id, status, artist_payout_status, refund_cents").eq("id", GOLDEN).maybeSingle(),
    admin
      .from("artist_balance_transactions")
      .select("*")
      .eq("order_id", DISP_ORDER)
      .eq("transaction_type", "dispute_hold"),
  ]);

  return { disputeRow, order, webhook, ledger: ledger ?? [], golden, holdTxns: holdTxns ?? [] };
}

function validatePreExecution(
  lc: Awaited<ReturnType<typeof inspectLc>>,
  stripe: Awaited<ReturnType<typeof inspectStripe>>,
) {
  const failures: string[] = [];
  const d = lc.disputeRow;
  const o = lc.order;

  if (!d) failures.push("artist_disputes row missing");
  else {
    if (d.order_id !== null) failures.push(`artist_disputes.order_id expected NULL got ${d.order_id}`);
    if (d.artist_id !== null) failures.push(`artist_disputes.artist_id expected NULL got ${d.artist_id}`);
    if (d.stripe_transfer_reversal_id !== null)
      failures.push(`stripe_transfer_reversal_id expected NULL got ${d.stripe_transfer_reversal_id}`);
    if (d.stripe_dispute_id !== DISP_DISPUTE)
      failures.push(`stripe_dispute_id mismatch: ${d.stripe_dispute_id}`);
  }

  if (!o) failures.push("order missing");
  else {
    if (o.id !== DISP_ORDER) failures.push(`order id mismatch: ${o.id}`);
    if (o.status !== "paid") failures.push(`order.status expected paid got ${o.status}`);
    if (o.artist_payout_status !== "pending")
      failures.push(`artist_payout_status expected pending got ${o.artist_payout_status}`);
    if (Number(o.refund_cents ?? 0) !== 0) failures.push(`refund_cents expected 0 got ${o.refund_cents}`);
    if (Number(o.gross_cents) !== 2000) failures.push(`gross_cents expected 2000 got ${o.gross_cents}`);
    if (Number(o.platform_fee_cents) !== 200)
      failures.push(`platform_fee_cents expected 200 got ${o.platform_fee_cents}`);
    if (Number(o.artist_earnings_cents) !== 1800)
      failures.push(`artist_earnings_cents expected 1800 got ${o.artist_earnings_cents}`);
  }

  if (stripe.dispute.livemode) failures.push("Stripe dispute livemode must be false");
  if (stripe.transfer.amount !== 2000) failures.push(`transfer amount expected 2000 got ${stripe.transfer.amount}`);
  if (stripe.transfer.amount_reversed !== 0)
    failures.push(`transfer amount_reversed expected 0 got ${stripe.transfer.amount_reversed}`);
  if (stripe.disputeReversals.length > 0) failures.push("existing dispute reversal(s) found in Stripe");

  return { ok: failures.length === 0, failures };
}

async function main() {
  const report: Record<string, unknown> = {
    phase: "5F.1-execute",
    startedAt: new Date().toISOString(),
    deployCommit: "4517f32",
  };

  report.health = await fetchHealth();

  const sk = loadStripeKey();
  process.env.STRIPE_SECRET_KEY = sk;
  const creds = loadServiceKey();
  process.env.NEXT_PUBLIC_SUPABASE_URL = creds.url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = creds.key;

  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  report.preExecution = {
    liveCircuit: await inspectLc(admin),
    stripe: await inspectStripe(stripe),
  };

  const preCheck = validatePreExecution(
    report.preExecution.liveCircuit as Awaited<ReturnType<typeof inspectLc>>,
    report.preExecution.stripe as Awaited<ReturnType<typeof inspectStripe>>,
  );
  report.preExecutionSafety = preCheck;

  if (!preCheck.ok) {
    report.stopped = "Pre-execution safety check failed";
    writeReport(report);
    console.error("STOP: pre-execution safety failed", preCheck.failures);
    process.exit(2);
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  const { getStripe } = await import("@/lib/stripe/server");
  const { resolveOrphanedDispute } = await import("@/lib/services/dispute.service");

  report.remediationRun1 = await resolveOrphanedDispute(getSupabaseAdmin(), getStripe(), {
    disputeId: DISP_DISPUTE,
  });

  const run1 = report.remediationRun1 as {
    ok: boolean;
    alreadyResolved: boolean;
    reversalAmountCents: number | null;
    transferReversalId: string | null;
    error?: string;
  };

  if (run1.reversalAmountCents != null && run1.reversalAmountCents > MAX_REVERSAL) {
    report.stopped = `CRITICAL: reversal ${run1.reversalAmountCents} exceeds max ${MAX_REVERSAL}`;
    report.postExecution = {
      liveCircuit: await inspectLc(admin),
      stripe: await inspectStripe(stripe),
    };
    writeReport(report);
    process.exit(4);
  }

  if (!run1.alreadyResolved && (!run1.ok || run1.reversalAmountCents !== MAX_REVERSAL)) {
    report.stopped = "Remediation failed or reversal amount not 1800";
    report.postExecution = {
      liveCircuit: await inspectLc(admin),
      stripe: await inspectStripe(stripe),
    };
    writeReport(report);
    console.error("STOP: remediation issue", run1);
    process.exit(3);
  }

  await new Promise((r) => setTimeout(r, 3000));

  report.postExecution = {
    liveCircuit: await inspectLc(admin),
    stripe: await inspectStripe(stripe),
  };

  report.idempotencyRun2 = await resolveOrphanedDispute(getSupabaseAdmin(), getStripe(), {
    disputeId: DISP_DISPUTE,
  });

  await new Promise((r) => setTimeout(r, 2000));

  report.afterIdempotency = {
    liveCircuit: await inspectLc(admin),
    stripe: await inspectStripe(stripe),
  };

  report.finishedAt = new Date().toISOString();
  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
}

function writeReport(report: Record<string, unknown>) {
  const outPath = join(process.cwd(), "scripts", "phase-5f1-execution-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("Wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
