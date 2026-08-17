/**
 * Phase 5F.2 — Clean DISP end-to-end verification (NEW order, TEST mode only).
 * Run: npx tsx scripts/phase-5f2-disp-e2e.ts
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const APP_URL = "https://www.watchlivecircuit.com";
const GOLDEN_ORDER_ID = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const HIST_DISP_ORDER = "56d3952c-43bc-4457-9a4d-e7a50deaec50";
const HIST_DISP_DISPUTE = "du_1U5FPtEJwfqaexCo2K4kMbhl";
const HIST_REVERSAL = "trr_1U5GOJEJwfqaexCoTES54ooP";
const ARTIST_ID = "91b8850b-c145-4fa1-9167-0ba83cd329e8";
const TOUR_STOP_ID = "9fc4eebc-5502-4f16-88dc-ebe1c412a53e";
const CONNECTED_ACCOUNT = "acct_1U3xwlEJwfCXyXc7";
const ADMIN_USER_ID = "468563fc-5dd6-4728-b55b-0fa78c67136c";
const DISPUTE_CARD = "4000000000000259";
const MAX_REVERSAL = 1800;

const report: Record<string, unknown> = {
  phase: "5F.2",
  startedAt: new Date().toISOString(),
  steps: [] as unknown[],
};

function step(name: string, data: Record<string, unknown>) {
  (report.steps as unknown[]).push({ name, at: new Date().toISOString(), ...data });
}

function stop(reason: string, data?: Record<string, unknown>): never {
  report.stopped = reason;
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(process.cwd(), "scripts", "phase-5f2-disp-report.json"), JSON.stringify(report, null, 2));
  throw new Error(`[STOP] ${reason}${data ? ` ${JSON.stringify(data)}` : ""}`);
}

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

async function createFan(admin: SupabaseClient) {
  const seed = `f2disp${Date.now()}`.slice(-14);
  const email = `phase5f2-disp-${seed}@test.watchlivecircuit.com`;
  const password = `Test!${seed}Lc`;
  const username = `p5f2${seed}`.slice(0, 24);
  const { data: auth, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Phase 5F2 DISP Fan", username, intended_role: "fan", is_test_account: true },
  });
  if (error || !auth.user) throw new Error(error?.message ?? "fan create failed");
  await admin
    .from("profiles")
    .update({
      display_name: "Phase 5F2 DISP Fan",
      username,
      role: "fan",
      is_test_account: true,
      test_scenario: "phase5f2_disp",
      test_created_by: ADMIN_USER_ID,
      test_created_at: new Date().toISOString(),
      onboarding_completed: true,
    })
    .eq("id", auth.user.id);
  return { userId: auth.user.id, email, password };
}

async function productionCheckoutAndPay(
  admin: SupabaseClient,
  fan: { userId: string; email: string; password: string },
) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("#email").fill(fan.email);
  await page.locator("#password").fill(fan.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 90_000,
  });
  await page.waitForTimeout(3000);

  const checkoutBody = await page.evaluate(async (tourStopId) => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ticket", tourStopId, tier: "general" }),
    });
    const json = (await res.json()) as { url?: string; error?: string; message?: string; sessionId?: string };
    return { ok: res.ok, status: res.status, json };
  }, TOUR_STOP_ID);

  if (!checkoutBody.ok || !checkoutBody.json.url) {
    await browser.close();
    throw new Error(checkoutBody.json.error ?? checkoutBody.json.message ?? `checkout HTTP ${checkoutBody.status}`);
  }

  const checkoutUrl = checkoutBody.json.url;
  const sessionMatch = checkoutUrl.match(/(cs_test_[A-Za-z0-9]+)/);
  const checkoutSessionId = sessionMatch?.[1] ?? checkoutBody.json.sessionId ?? null;

  await page.goto(checkoutUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(5000);

  await page.locator('[data-testid="card-accordion-item-button"]').click({ timeout: 30_000 }).catch(async () => {
    await page.locator("#payment-method-accordion-item-title-card").click({ force: true });
  });
  await page.waitForTimeout(4000);

  const fillFirstMatch = async (selectors: string[], value: string) => {
    for (const frame of page.frames()) {
      for (const selector of selectors) {
        const locator = frame.locator(selector).first();
        if ((await locator.count()) > 0) {
          await locator.fill(value);
          return true;
        }
      }
    }
    return false;
  };

  await fillFirstMatch(
    ['input[name="number"]', '[placeholder*="1234"]', '[autocomplete="cc-number"]', '#cardNumber'],
    DISPUTE_CARD,
  );
  await fillFirstMatch(
    ['input[name="expiry"]', '[placeholder*="MM"]', '[autocomplete="cc-exp"]', '#cardExpiry'],
    "1234",
  );
  await fillFirstMatch(
    ['input[name="cvc"]', '[placeholder*="CVC"]', '[autocomplete="cc-csc"]', '#cardCvc'],
    "123",
  );

  for (const frame of page.frames()) {
    const name = frame.locator(
      'input[name="name"], input[autocomplete="cc-name"], input[placeholder*="Full name"], input[aria-label*="name on card"]',
    );
    if ((await name.count()) > 0) {
      await name.first().fill("Phase 5F2 DISP Fan");
      break;
    }
  }

  for (const frame of page.frames()) {
    const postal = frame.locator('[name="postalCode"], [placeholder*="ZIP"], [autocomplete="postal-code"]').first();
    if ((await postal.count()) > 0) {
      await postal.fill("12345");
      break;
    }
  }

  await page.getByRole("checkbox").first().uncheck().catch(() => undefined);
  await page.getByTestId("hosted-payment-submit-button").click({ timeout: 30_000 });

  const start = Date.now();
  let paidOrder: Record<string, unknown> | null = null;
  while (Date.now() - start < 150_000) {
    const { data } = await admin
      .from("orders")
      .select("*")
      .eq("user_id", fan.userId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.id && data.id !== GOLDEN_ORDER_ID && data.id !== HIST_DISP_ORDER) {
      paidOrder = data;
      break;
    }
    await sleep(3000);
  }

  await browser.close();
  if (!paidOrder) throw new Error("Checkout did not produce a new paid order");
  return { checkoutUrl, checkoutSessionId, order: paidOrder };
}

async function snapshotOrderFull(admin: SupabaseClient, orderId: string) {
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  const piId = order?.stripe_payment_intent_id as string | undefined;
  const [{ data: txns }, { data: ledger }, { data: webhooks }, { data: disputes }] = await Promise.all([
    admin
      .from("artist_balance_transactions")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    piId
      ? admin
          .from("monetization_financial_ledger")
          .select("*")
          .or(`order_id.eq.${orderId},stripe_payment_intent_id.eq.${piId}`)
          .order("created_at", { ascending: true })
      : admin
          .from("monetization_financial_ledger")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true }),
    admin
      .from("monetization_stripe_webhook_events")
      .select("*")
      .eq("order_id", orderId)
      .order("processed_at", { ascending: true }),
    admin.from("artist_disputes").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
  ]);
  return { order, txns: txns ?? [], ledger: ledger ?? [], webhooks: webhooks ?? [], disputes: disputes ?? [] };
}

async function snapshotHistorical(admin: SupabaseClient) {
  const [{ data: golden }, { data: histOrder }, { data: histDispute }] = await Promise.all([
    admin.from("orders").select("id, status, artist_payout_status, refund_cents, updated_at").eq("id", GOLDEN_ORDER_ID).single(),
    admin.from("orders").select("id, status, artist_payout_status, refund_cents, updated_at").eq("id", HIST_DISP_ORDER).single(),
    admin.from("artist_disputes").select("*").eq("stripe_dispute_id", HIST_DISP_DISPUTE).maybeSingle(),
  ]);
  return { golden, histOrder, histDispute };
}

async function waitForDispute(
  admin: SupabaseClient,
  stripe: Stripe,
  orderId: string,
  piId: string,
  timeoutMs = 180_000,
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data: byOrder } = await admin.from("artist_disputes").select("*").eq("order_id", orderId).maybeSingle();
    if (byOrder?.stripe_dispute_id) return { disputeRow: byOrder, source: "order_id" };

    const { data: byPi } = await admin
      .from("artist_disputes")
      .select("*")
      .eq("stripe_payment_intent_id", piId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byPi?.stripe_dispute_id) return { disputeRow: byPi, source: "payment_intent" };

    const disputes = await stripe.disputes.list({ payment_intent: piId, limit: 5 });
    if (disputes.data.length > 0) {
      const { data: row } = await admin
        .from("artist_disputes")
        .select("*")
        .eq("stripe_dispute_id", disputes.data[0].id)
        .maybeSingle();
      if (row) return { disputeRow: row, source: "stripe_list", stripeDispute: disputes.data[0] };
    }

    await sleep(5000);
  }
  return null;
}

async function main() {
  const sk = loadStripeKey();
  if (sk.startsWith("sk_live_")) stop("Live Stripe key detected");

  const creds = loadServiceKey();
  process.env.STRIPE_SECRET_KEY = sk;
  process.env.SUPABASE_SERVICE_ROLE_KEY = creds.key;
  process.env.NEXT_PUBLIC_SUPABASE_URL = creds.url;

  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  const healthRes = await fetch(`${APP_URL}/api/health`);
  report.health = { status: healthRes.status, body: await healthRes.json() };

  report.baseline = await snapshotHistorical(admin);
  step("baseline-historical-golden", { ok: true, baseline: report.baseline });

  const fan = await createFan(admin);
  report.fan = { userId: fan.userId, email: fan.email };
  step("create-fan", { ok: true, fan: report.fan });

  const { checkoutUrl, checkoutSessionId, order: paidOrderRaw } = await productionCheckoutAndPay(admin, fan);
  const orderId = paidOrderRaw.id as string;
  report.newOrderId = orderId;
  report.checkoutUrl = checkoutUrl;
  report.checkoutSessionId = checkoutSessionId;

  if (orderId === GOLDEN_ORDER_ID || orderId === HIST_DISP_ORDER) {
    stop("New order collided with protected order ID", { orderId });
  }

  step("checkout-complete", { ok: true, orderId, checkoutSessionId, checkoutUrl });

  await sleep(5000);
  let snap = await snapshotOrderFull(admin, orderId);
  const piId = snap.order?.stripe_payment_intent_id as string;
  if (!piId) stop("Missing stripe_payment_intent_id on new order");

  const pi = await stripe.paymentIntents.retrieve(piId, {
    expand: ["latest_charge.balance_transaction", "latest_charge.transfer", "latest_charge.application_fee"],
  });
  const charge = pi.latest_charge as Stripe.Charge;
  const transferId =
    typeof charge.transfer === "string" ? charge.transfer : (charge.transfer as Stripe.Transfer | null)?.id ?? null;
  const bt =
    typeof charge.balance_transaction === "object"
      ? charge.balance_transaction
      : charge.balance_transaction
        ? await stripe.balanceTransactions.retrieve(charge.balance_transaction as string)
        : null;
  const session = checkoutSessionId
    ? await stripe.checkout.sessions.retrieve(checkoutSessionId)
    : await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 }).then((r) => r.data[0]);

  if (pi.livemode || charge.livemode) stop("Live mode Stripe object on new payment");
  if (session.status !== "complete" || session.payment_status !== "paid") {
    stop("Checkout session not complete/paid", { status: session.status, payment_status: session.payment_status });
  }
  if (pi.status !== "succeeded" || charge.status !== "succeeded") {
    stop("PaymentIntent or Charge not succeeded", { pi: pi.status, charge: charge.status });
  }
  if (charge.application_fee_amount !== 200) {
    stop("application_fee_amount not 200", { actual: charge.application_fee_amount });
  }
  if (charge.transfer_data?.destination !== CONNECTED_ACCOUNT) {
    stop("transfer destination mismatch", { actual: charge.transfer_data?.destination });
  }

  report.stripePayment = {
    paymentIntentId: pi.id,
    chargeId: charge.id,
    transferId,
    applicationFeeAmount: charge.application_fee_amount,
    balanceTransactionId: bt?.id ?? null,
    stripeFeeCents: bt?.fee ?? null,
    chargeAmount: charge.amount,
    livemode: pi.livemode,
  };
  step("verify-payment-stripe", { ok: true, ...report.stripePayment });

  const bookOk =
    snap.order?.status === "paid" &&
    snap.order?.stripe_payment_intent_id === piId &&
    !!snap.order?.stripe_checkout_session_id &&
    Number(snap.order?.gross_cents) === 2000 &&
    Number(snap.order?.platform_fee_cents) === 200 &&
    Number(snap.order?.artist_earnings_cents) === 1800 &&
    snap.order?.artist_payout_status === "pending";

  const ticketSales = snap.txns.filter((t) => t.transaction_type === "ticket_sale");
  step("verify-lc-bookkeeping-immediate", {
    ok: bookOk,
    order: {
      id: snap.order?.id,
      status: snap.order?.status,
      stripe_payment_intent_id: snap.order?.stripe_payment_intent_id,
      stripe_checkout_session_id: snap.order?.stripe_checkout_session_id,
      stripe_transfer_id: snap.order?.stripe_transfer_id,
      stripe_fee_cents: snap.order?.stripe_fee_cents,
      stripe_balance_transaction_id: snap.order?.stripe_balance_transaction_id,
      gross_cents: snap.order?.gross_cents,
      platform_fee_cents: snap.order?.platform_fee_cents,
      artist_earnings_cents: snap.order?.artist_earnings_cents,
      artist_payout_status: snap.order?.artist_payout_status,
    },
    ticketSaleCount: ticketSales.length,
    ticketSalePending: ticketSales[0]?.pending_delta_cents,
  });

  if (!bookOk) stop("LiveCircuit bookkeeping failed immediate check");
  if (ticketSales.length !== 1 || Number(ticketSales[0]?.pending_delta_cents) !== 1800) {
    stop("Expected exactly one ticket_sale +1800 pending", { ticketSales });
  }

  // Allow fee reconciliation to complete
  for (let i = 0; i < 12; i++) {
    snap = await snapshotOrderFull(admin, orderId);
    if (snap.order?.stripe_transfer_id && snap.order?.stripe_fee_cents != null) break;
    await sleep(5000);
  }

  step("wait-dispute", { started: new Date().toISOString() });
  const disputeResult = await waitForDispute(admin, stripe, orderId, piId, 180_000);
  if (!disputeResult?.disputeRow) stop("Dispute did not arrive within timeout", { orderId, piId });

  const disputeRow = disputeResult.disputeRow;
  const stripeDispute = await stripe.disputes.retrieve(disputeRow.stripe_dispute_id as string);
  const disputeEvents = await admin
    .from("monetization_stripe_webhook_events")
    .select("*")
    .eq("event_type", "charge.dispute.created")
    .or(`order_id.eq.${orderId},stripe_event_id.like.evt_%`)
    .order("processed_at", { ascending: false })
    .limit(10);

  report.dispute = {
    disputeId: disputeRow.stripe_dispute_id,
    disputeAmount: stripeDispute.amount,
    livemode: stripeDispute.livemode,
    disputeRow,
    resolutionSource: disputeResult.source,
  };

  if (stripeDispute.livemode) stop("Dispute is live mode");
  if (disputeRow.order_id !== orderId) {
    stop("D5 failed: dispute linked to wrong order", {
      expected: orderId,
      actual: disputeRow.order_id,
    });
  }
  if (disputeRow.artist_id !== ARTIST_ID) {
    stop("D5 failed: wrong artist", { expected: ARTIST_ID, actual: disputeRow.artist_id });
  }
  if (disputeRow.order_id === null) {
    stop("D5 failed: dispute remains orphaned", { disputeRow });
  }

  step("verify-d5-resolution", {
    ok: true,
    order_id: disputeRow.order_id,
    artist_id: disputeRow.artist_id,
    livecircuit_status: disputeRow.livecircuit_status,
  });

  snap = await snapshotOrderFull(admin, orderId);
  const holdTxns = snap.txns.filter((t) => t.transaction_type === "dispute_hold");
  if (snap.order?.artist_payout_status !== "held") {
    stop("Order not held", { artist_payout_status: snap.order?.artist_payout_status });
  }
  if (holdTxns.length !== 1) {
    stop("Expected exactly one dispute_hold transaction", { count: holdTxns.length, holdTxns });
  }

  step("verify-hold", {
    ok: true,
    artist_payout_status: snap.order?.artist_payout_status,
    holdTxn: holdTxns[0],
  });

  const effectiveTransferId =
    (disputeRow.stripe_transfer_id as string) ||
    (snap.order?.stripe_transfer_id as string) ||
    transferId;
  if (!effectiveTransferId) stop("No transfer ID available for reversal check");

  const transfer = await stripe.transfers.retrieve(effectiveTransferId);
  const reversals = await stripe.transfers.listReversals(effectiveTransferId, { limit: 10 });
  const disputeReversals = reversals.data.filter(
    (r) => r.metadata?.dispute_id === disputeRow.stripe_dispute_id,
  );

  if (disputeReversals.length > 1) stop("More than one dispute reversal", { disputeReversals });
  if (disputeReversals.some((r) => r.amount > MAX_REVERSAL)) {
    stop("Reversal exceeds 1800 cents", { reversals: disputeReversals });
  }
  if (disputeReversals.some((r) => r.amount === 2000)) {
    stop("CRITICAL: 2000-cent reversal detected", { reversals: disputeReversals });
  }

  const reversal = disputeReversals[0] ?? null;
  const reversalAmount =
    reversal?.amount ??
    (typeof disputeRow.metadata?.reversal_amount_cents === "number"
      ? disputeRow.metadata.reversal_amount_cents
      : null);

  if (!disputeRow.stripe_transfer_reversal_id && !reversal) {
    // Allow deferred resolution window — poll a bit more
    await sleep(15000);
    const refreshed = await admin.from("artist_disputes").select("*").eq("order_id", orderId).maybeSingle();
    if (!refreshed.data?.stripe_transfer_reversal_id) {
      stop("No transfer reversal after dispute", { disputeRow: refreshed.data, transfer });
    }
    Object.assign(disputeRow, refreshed.data);
  }

  if (reversalAmount !== MAX_REVERSAL && transfer.amount_reversed !== MAX_REVERSAL) {
    stop("D4 reversal not 1800", {
      reversalAmount,
      amount_reversed: transfer.amount_reversed,
      disputeRowReversal: disputeRow.metadata?.reversal_amount_cents,
    });
  }

  report.reversal = {
    transferReversalId: disputeRow.stripe_transfer_reversal_id ?? reversal?.id,
    reversalAmountCents: reversalAmount ?? disputeRow.metadata?.reversal_amount_cents,
    transferAmount: transfer.amount,
    transferAmountReversed: transfer.amount_reversed,
    reversalCount: disputeReversals.length,
  };

  step("verify-d4-reversal", { ok: true, ...report.reversal });

  snap = await snapshotOrderFull(admin, orderId);
  const disputeLedger = snap.ledger.filter(
    (e) => e.entry_type === "dispute" && e.stripe_event_id === disputeRow.stripe_dispute_id,
  );
  if (disputeLedger.length > 1) {
    stop("More than one dispute ledger entry", { disputeLedger });
  }

  step("verify-ledger", {
    ok: true,
    ticketSaleTxns: snap.txns.filter((t) => t.transaction_type === "ticket_sale"),
    holdTxns: snap.txns.filter((t) => t.transaction_type === "dispute_hold"),
    disputeLedgerEntries: disputeLedger,
    allLedger: snap.ledger.map((e) => ({
      id: e.id,
      entry_type: e.entry_type,
      amount_cents: e.amount_cents,
      stripe_event_id: e.stripe_event_id,
    })),
  });

  const disputeWebhooks = snap.webhooks.filter((w) => w.event_type === "charge.dispute.created");
  step("duplicate-protection", {
    ok: true,
    disputeWebhookCount: disputeWebhooks.length,
    disputeWebhookStatuses: disputeWebhooks.map((w) => ({
      id: w.stripe_event_id,
      status: w.status,
    })),
    reversalCount: disputeReversals.length,
    holdCount: holdTxns.length,
    disputeLedgerCount: disputeLedger.length,
  });

  const { data: artistBalance } = await admin
    .from("artist_balances")
    .select("*")
    .eq("artist_id", ARTIST_ID)
    .maybeSingle();

  report.finalReconciliation = {
    gross: snap.order?.gross_cents,
    platformFee: snap.order?.platform_fee_cents,
    artistEarnings: snap.order?.artist_earnings_cents,
    stripeFeeCents: snap.order?.stripe_fee_cents ?? bt?.fee,
    paymentIntent: piId,
    charge: charge.id,
    transfer: effectiveTransferId,
    transferReversal: report.reversal,
    refunds: snap.order?.refund_cents,
    dispute: disputeRow.stripe_dispute_id,
    disputeAmount: stripeDispute.amount,
    disputeReversalCents: report.reversal,
    artistPending: artistBalance?.pending_cents,
    artistAvailable: artistBalance?.available_cents,
    payoutStatus: snap.order?.artist_payout_status,
  };

  const afterHistorical = await snapshotHistorical(admin);
  const goldenOk =
    afterHistorical.golden?.artist_payout_status === (report.baseline as { golden: { artist_payout_status: string } }).golden?.artist_payout_status &&
    afterHistorical.golden?.refund_cents === 0;
  const histOk =
    afterHistorical.histOrder?.id === HIST_DISP_ORDER &&
    afterHistorical.histDispute?.stripe_transfer_reversal_id === HIST_REVERSAL;

  report.goldenSafety = { ok: goldenOk && histOk, before: report.baseline, after: afterHistorical };
  step("golden-historical-safety", report.goldenSafety as Record<string, unknown>);

  if (!goldenOk || !histOk) stop("Golden or historical DISP objects changed");

  report.summary = {
    newOrderId: orderId,
    checkoutSessionId: snap.order?.stripe_checkout_session_id ?? checkoutSessionId,
    paymentIntentId: piId,
    chargeId: charge.id,
    transferId: effectiveTransferId,
    applicationFeeAmount: charge.application_fee_amount,
    balanceTransactionId: bt?.id,
    stripeFeeCents: snap.order?.stripe_fee_cents ?? bt?.fee,
    disputeId: disputeRow.stripe_dispute_id,
    disputeWebhookEvents: disputeWebhooks.map((w) => w.stripe_event_id),
    artistDisputeRow: disputeRow,
    holdTransaction: holdTxns[0],
    transferReversalId: report.reversal,
    d5Pass: disputeRow.order_id === orderId,
    d4Pass: (report.reversal as { reversalAmountCents: number }).reversalAmountCents === MAX_REVERSAL,
  };

  report.finishedAt = new Date().toISOString();
  writeFileSync(join(process.cwd(), "scripts", "phase-5f2-disp-report.json"), JSON.stringify(report, null, 2));
  console.log("Report: scripts/phase-5f2-disp-report.json");
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((e) => {
  report.fatalError = e instanceof Error ? e.message : String(e);
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(process.cwd(), "scripts", "phase-5f2-disp-report.json"), JSON.stringify(report, null, 2));
  console.error(e);
  process.exit(1);
});
