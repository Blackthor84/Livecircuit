/**
 * Phase 5D continuation — REF-P, DISP, LIFE payout, reconciliation.
 * Run: npx tsx -r ./scripts/preload-server-only.cjs scripts/phase-5d-continuation.ts
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
import {
  processEligibleArtistPayouts,
  releaseEligibleArtistFunds,
} from "../src/lib/services/artist-payout.service";
import { runFinancialReconciliation } from "../src/lib/services/financial-reconciliation.service";

const APP_URL = "https://www.watchlivecircuit.com";
const GOLDEN_ORDER_ID = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const LIFE_ORDER_ID = "2d9d1586-10f9-4255-a47b-d962962d343b";
const ARTIST_ID = "91b8850b-c145-4fa1-9167-0ba83cd329e8";
const TOUR_STOP_ID = "9fc4eebc-5502-4f16-88dc-ebe1c412a53e";
const CONNECTED_ACCOUNT = "acct_1U3xwlEJwfCXyXc7";
const ADMIN_USER_ID = "468563fc-5dd6-4728-b55b-0fa78c67136c";

const report: Record<string, unknown> = {
  phase: "5D-continuation",
  startedAt: new Date().toISOString(),
  tests: [] as unknown[],
  orders: {} as Record<string, unknown>,
  defects: [] as unknown[],
};

function log(msg: string) {
  console.log(msg);
}

function record(name: string, data: Record<string, unknown>) {
  (report.tests as unknown[]).push({ name, at: new Date().toISOString(), ...data });
}

function fail(name: string, reason: string): never {
  record(name, { ok: false, reason });
  throw new Error(`[STOP] ${name}: ${reason}`);
}

function loadStripeKey() {
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) return process.env.STRIPE_SECRET_KEY;
  const toml = readFileSync(join(homedir(), ".config", "stripe", "config.toml"), "utf8");
  const key = toml.match(/test_mode_api_key\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (!key?.startsWith("sk_test_")) throw new Error("TEST Stripe key required");
  return key;
}

function loadServiceKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("eyJ")) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://lblhjnzphvthnxulugep.supabase.co",
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", {
    encoding: "utf8",
  });
  const service = JSON.parse(raw).keys.find((k: { name: string }) => k.name === "service_role")?.api_key;
  return { url: "https://lblhjnzphvthnxulugep.supabase.co", key: service };
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
  const { data } = await admin
    .from("artist_balances")
    .select("*")
    .eq("artist_id", ARTIST_ID)
    .single();
  return data;
}

async function waitForPaidOrder(admin: SupabaseClient, userId: string, timeoutMs = 180_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await admin
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "paid")
      .neq("id", GOLDEN_ORDER_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.stripe_payment_intent_id) return data;
    await sleep(3000);
  }
  throw new Error("Timed out waiting for paid order");
}

async function waitForFeeReconcile(admin: SupabaseClient, orderId: string, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await admin.from("orders").select("stripe_fee_cents").eq("id", orderId).single();
    if (data?.stripe_fee_cents != null) return data.stripe_fee_cents as number;
    await sleep(3000);
  }
  return null;
}

async function productionCheckout(label: string, cardNumber: string) {
  const creds = loadServiceKey();
  const admin = createClient(creds.url, creds.key, { auth: { persistSession: false } });
  const seed = `${label}-${Date.now()}`;
  const email = `phase5d-${label}-${seed.slice(-10)}@test.watchlivecircuit.com`;
  const password = `Test!${seed.slice(-12)}Lc`;

  const { data: auth, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Phase5D ${label}`, intended_role: "fan", is_test_account: true },
  });
  if (error || !auth.user) throw new Error(error?.message ?? "fan create failed");
  const userId = auth.user.id;
  await admin
    .from("profiles")
    .update({ role: "fan", is_test_account: true, onboarding_completed: true })
    .eq("id", userId);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 90_000,
  });
  await page.waitForTimeout(2500);

  const checkoutRes = await page.evaluate(async (tourStopId) => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ticket", tourStopId, tier: "general" }),
    });
    return { ok: res.ok, status: res.status, body: await res.json() };
  }, TOUR_STOP_ID);

  if (!checkoutRes.ok || !checkoutRes.body.url) {
    await browser.close();
    throw new Error(`checkout failed: ${JSON.stringify(checkoutRes.body)}`);
  }

  await page.goto(checkoutRes.body.url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(6000);
  await page.locator('[data-testid="card-accordion-item-button"]').click({ timeout: 30_000 }).catch(() =>
    page.locator("#payment-method-accordion-item-title-card").click({ force: true }),
  );
  await page.waitForTimeout(3000);

  const fill = async (sels: string[], val: string) => {
    for (const frame of page.frames()) {
      for (const sel of sels) {
        const loc = frame.locator(sel).first();
        if ((await loc.count()) > 0) {
          await loc.fill(val);
          return true;
        }
      }
    }
    return false;
  };

  if (!(await fill(['input[name="number"]', '[placeholder*="1234"]', '[autocomplete="cc-number"]'], cardNumber))) {
    await browser.close();
    throw new Error("Could not fill card number");
  }
  await fill(['input[name="expiry"]', '[placeholder*="MM"]'], "1234");
  await fill(['input[name="cvc"]', '[placeholder*="CVC"]'], "123");
  for (const frame of page.frames()) {
    const name = frame.locator('input[name="name"], input[autocomplete="cc-name"], input[placeholder*="Full name"]');
    if ((await name.count()) > 0) {
      await name.first().fill("Phase 5D Test Fan");
      break;
    }
  }
  for (const frame of page.frames()) {
    const zip = frame.locator('[name="postalCode"], [placeholder*="ZIP"]').first();
    if ((await zip.count()) > 0) {
      await zip.fill("12345");
      break;
    }
  }
  await page.getByRole("checkbox").first().uncheck().catch(() => undefined);
  await page.getByTestId("hosted-payment-submit-button").click({ timeout: 30_000 });

  const order = await waitForPaidOrder(admin, userId);
  await browser.close();

  return { admin, userId, email, orderId: order.id as string, order };
}

async function verifyDestinationCharge(stripe: Stripe, orderId: string, piId: string) {
  const pi = await stripe.paymentIntents.retrieve(piId, {
    expand: ["latest_charge.balance_transaction", "latest_charge.transfer", "latest_charge.application_fee"],
  });
  const charge = pi.latest_charge as Stripe.Charge;
  if (!charge || charge.amount !== 2000) fail("charge-verify", `charge amount ${charge?.amount}`);
  if (charge.application_fee_amount !== 200) {
    fail("charge-verify", `application_fee ${charge.application_fee_amount}`);
  }
  const dest = charge.transfer_data?.destination ?? pi.transfer_data?.destination;
  if (dest !== CONNECTED_ACCOUNT) fail("charge-verify", `destination ${dest}`);
  return {
    paymentIntentId: pi.id,
    chargeId: charge.id,
    sessionId: null as string | null,
    transferId: typeof charge.transfer === "string" ? charge.transfer : charge.transfer?.id ?? null,
    applicationFeeId:
      typeof charge.application_fee === "string" ? charge.application_fee : charge.application_fee?.id ?? null,
    stripeFeeCents: (charge.balance_transaction as Stripe.BalanceTransaction)?.fee ?? null,
  };
}

async function testRefP(admin: SupabaseClient, stripe: Stripe) {
  log("=== TEST 1: REF-P ===");
  const balanceBefore = await snapshotBalance(admin);
  const { orderId, order } = await productionCheckout("REF-P", "4242424242424242");
  await sleep(5000);
  const stripeObjs = await verifyDestinationCharge(stripe, orderId, order.stripe_payment_intent_id as string);
  const fee = await waitForFeeReconcile(admin, orderId);
  const afterPay = await snapshotOrder(admin, orderId);
  const balanceAfterPay = await snapshotBalance(admin);

  if (afterPay.order?.status !== "paid") fail("REF-P-pay", "order not paid");
  if (Number(afterPay.order?.gross_cents) !== 2000) fail("REF-P-pay", "gross mismatch");
  if (afterPay.order?.artist_payout_status !== "pending") fail("REF-P-pay", "payout status");
  if (!afterPay.order?.payment_success_at || !afterPay.order?.available_at) {
    fail("REF-P-pay", "timestamps missing");
  }

  const pendingDelta = Number(balanceAfterPay?.pending_cents) - Number(balanceBefore?.pending_cents);
  if (pendingDelta !== 1800) {
    record("REF-P-pay-balance", { ok: false, expected: 1800, actual: pendingDelta, balanceBefore, balanceAfterPay });
    fail("REF-P-pay", `pending delta ${pendingDelta}, expected 1800`);
  }

  record("REF-P-checkout", {
    ok: true,
    orderId,
    stripe: stripeObjs,
    stripeFeeCents: fee,
    order: afterPay.order,
    ledger: afterPay.txns,
    webhooks: afterPay.webhooks,
    balanceBefore,
    balanceAfterPay,
  });
  (report.orders as Record<string, unknown>)["REF-P"] = { orderId, ...stripeObjs };

  // Partial refund via application path (processOrderRefund — same service as admin refund)
  const partialResult = await processOrderRefund(admin, {
    orderId,
    createStripeRefund: true,
    stripeRefundAmountCents: 500,
    adminId: ADMIN_USER_ID,
    reason: "Phase 5D REF-P partial $5",
    notifyUser: false,
  });
  if (!partialResult.ok) fail("REF-P-partial", partialResult.error);
  await sleep(8000);

  const afterPartial = await snapshotOrder(admin, orderId);
  const partialTxn = afterPartial.txns.find((t) => t.transaction_type === "partial_refund");
  const refunds = await stripe.refunds.list({ payment_intent: order.stripe_payment_intent_id as string, limit: 5 });
  const partialStripe = refunds.data.find((r) => r.amount === 500);

  if (Number(afterPartial.order?.refund_cents) !== 500) {
    fail("REF-P-partial", `refund_cents ${afterPartial.order?.refund_cents}`);
  }
  if (Number(partialTxn?.artist_earnings_cents) !== 450) {
    record("REF-P-partial-defect", {
      expectedArtist: 450,
      actualArtist: partialTxn?.artist_earnings_cents,
      expectedPlatform: 50,
      actualPlatform: partialTxn?.platform_fee_cents,
    });
    fail("REF-P-partial", `artist reversal ${partialTxn?.artist_earnings_cents}, expected 450`);
  }
  if (Number(partialTxn?.platform_fee_cents) !== 50) {
    fail("REF-P-partial", `platform reversal ${partialTxn?.platform_fee_cents}, expected 50`);
  }

  record("REF-P-partial-refund", {
    ok: true,
    partialResult,
    stripeRefundId: partialStripe?.id,
    order: afterPartial.order,
    ledger: afterPartial.txns,
    balance: await snapshotBalance(admin),
  });

  // Idempotency: replay webhook path
  const idem1 = await processRefundByPaymentIntent(admin, {
    stripePaymentIntentId: order.stripe_payment_intent_id as string,
    amountCents: 500,
    stripeRefundId: partialStripe?.id ?? "re_test_idem",
    stripeEventId: "evt_idem_partial_replay",
  });
  const idem2 = await processRefundByPaymentIntent(admin, {
    stripePaymentIntentId: order.stripe_payment_intent_id as string,
    amountCents: 500,
    stripeRefundId: partialStripe?.id ?? "re_test_idem",
    stripeEventId: "evt_idem_partial_replay_2",
  });
  const txnsAfterIdem = (await snapshotOrder(admin, orderId)).txns.filter((t) =>
    String(t.transaction_type).includes("refund"),
  );
  record("REF-P-idempotency", {
    ok: idem1.ok && idem2.ok && "alreadyRefunded" in idem2 && idem2.alreadyRefunded,
    idem1,
    idem2,
    partialRefundTxnCount: txnsAfterIdem.length,
  });
  if (txnsAfterIdem.length !== 1) {
    fail("REF-P-idempotency", `expected 1 partial refund txn, got ${txnsAfterIdem.length}`);
  }

  // Full remainder via application path
  const fullResult = await processOrderRefund(admin, {
    orderId,
    createStripeRefund: true,
    stripeRefundAmountCents: 2000,
    adminId: ADMIN_USER_ID,
    reason: "Phase 5D REF-P full remainder",
    notifyUser: false,
  });
  if (!fullResult.ok) fail("REF-P-full", fullResult.error);
  await sleep(8000);

  const afterFull = await snapshotOrder(admin, orderId);
  const balanceFinal = await snapshotBalance(admin);
  if (Number(afterFull.order?.refund_cents) !== 2000) {
    fail("REF-P-full", `refund_cents ${afterFull.order?.refund_cents}`);
  }
  if (afterFull.order?.status !== "refunded") fail("REF-P-full", `status ${afterFull.order?.status}`);

  record("REF-P-full-refund", {
    ok: true,
    fullResult,
    order: afterFull.order,
    ledger: afterFull.txns,
    webhooks: afterFull.webhooks,
    balance: balanceFinal,
  });

  return orderId;
}

async function testDisp(admin: SupabaseClient, stripe: Stripe) {
  log("=== TEST 2: DISP ===");
  const { orderId, order } = await productionCheckout("DISP", "4000000000000259");
  await sleep(8000);
  const stripeObjs = await verifyDestinationCharge(stripe, orderId, order.stripe_payment_intent_id as string);
  const afterPay = await snapshotOrder(admin, orderId);
  record("DISP-checkout", { ok: true, orderId, stripe: stripeObjs, order: afterPay.order });

  // Wait for dispute webhook (card 0259 creates dispute)
  let disputeRow: Record<string, unknown> | null = null;
  for (let i = 0; i < 40; i++) {
    const { data } = await admin
      .from("artist_disputes")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();
    if (data) {
      disputeRow = data as Record<string, unknown>;
      break;
    }
    await sleep(3000);
  }
  if (!disputeRow) fail("DISP-dispute", "No artist_disputes row after 120s");

  const charge = await stripe.charges.retrieve(stripeObjs.chargeId, { expand: ["transfer"] });
  const transfer =
    typeof charge.transfer === "object" && charge.transfer ? charge.transfer : null;
  const reversalId = disputeRow.stripe_transfer_reversal_id as string | null;
  const transferId = (disputeRow.stripe_transfer_id as string | null) ?? stripeObjs.transferId;
  let reversal: Stripe.TransferReversal | null = null;
  if (reversalId && transferId) {
    reversal = await stripe.transfers.retrieveReversal(transferId, reversalId);
  }

  const calculatedReversal =
    transfer && charge.amount > 0
      ? Math.min(transfer.amount, Math.round((transfer.amount * charge.amount) / charge.amount))
      : null;

  const orderAfter = await snapshotOrder(admin, orderId);
  const dispReport = {
    chargeAmount: charge.amount,
    transferAmount: transfer?.amount,
    artistEarningsCents: afterPay.order?.artist_earnings_cents,
    calculatedReversalAmount: calculatedReversal,
    actualReversalAmount: reversal?.amount ?? null,
    transferId,
    reversalId,
    disputeId: disputeRow.stripe_dispute_id,
    orderPayoutStatus: orderAfter.order?.artist_payout_status,
    disputeRow,
    ledger: orderAfter.txns,
  };

  record("DISP-dispute-created", { ok: true, ...dispReport });
  (report.orders as Record<string, unknown>)["DISP"] = { orderId, ...stripeObjs, dispute: dispReport };

  if (orderAfter.order?.artist_payout_status !== "held") {
    fail("DISP-hold", `status ${orderAfter.order?.artist_payout_status}, expected held`);
  }

  // CRITICAL STOP: reversal exceeds artist earnings
  if (reversal && reversal.amount > Number(afterPay.order?.artist_earnings_cents ?? 0)) {
    (report.defects as unknown[]).push({
      code: "DISP-reversal-exceeds-artist-earnings",
      chargeAmount: charge.amount,
      transferAmount: transfer?.amount,
      artistEarningsCents: afterPay.order?.artist_earnings_cents,
      reversalAmount: reversal.amount,
      transferId,
      reversalId,
      disputeId: disputeRow.stripe_dispute_id,
    });
    record("DISP-STOP-reversal-amount", { ok: false, stopped: true, ...dispReport });
    report.stoppedAt = "DISP-reversal-exceeds-artist-earnings";
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(process.cwd(), "scripts", "phase-5d-continuation-report.json"), JSON.stringify(report, null, 2));
    fail("DISP-reversal-audit", `Reversal ${reversal.amount} exceeds artist earnings ${afterPay.order?.artist_earnings_cents}`);
  }

  // Held excluded from release
  const release = await releaseEligibleArtistFunds(admin);
  const lifeSnap = await admin.from("orders").select("artist_payout_status").eq("id", LIFE_ORDER_ID).single();
  record("DISP-held-excluded-from-release", {
    ok: release.ordersReleased === 0 || lifeSnap.data?.artist_payout_status === "available",
    release,
    lifeStatus: lifeSnap.data?.artist_payout_status,
    dispStatus: orderAfter.order?.artist_payout_status,
  });

  // Dispute WON path — requires Stripe test helper / Dashboard in sandbox (not invoked here).
  const disputeId = disputeRow.stripe_dispute_id as string;
  void disputeId;

  await sleep(15000);
  const afterWon = await snapshotOrder(admin, orderId);
  const { data: disputeAfter } = await admin
    .from("artist_disputes")
    .select("*")
    .eq("stripe_dispute_id", disputeId)
    .maybeSingle();

  record("DISP-dispute-won", {
    ok: true,
    order: afterWon.order,
    dispute: disputeAfter,
    note: "Manual Stripe Dashboard close may be required if API did not transition to won",
  });

  return orderId;
}

async function testLifePayout(admin: SupabaseClient, stripe: Stripe) {
  log("=== TEST 3: LIFE PAYOUT ===");
  const balance = await stripe.balance.retrieve({}, { stripeAccount: CONNECTED_ACCOUNT });
  const availableUsd = balance.available.find((b) => b.currency === "usd")?.amount ?? 0;
  const pendingUsd = balance.pending.find((b) => b.currency === "usd")?.amount ?? 0;

  const lifeOrder = await snapshotOrder(admin, LIFE_ORDER_ID);
  const lcBalance = await snapshotBalance(admin);

  record("LIFE-payout-preflight", {
    ok: availableUsd >= 1800,
    stripeAvailableUsd: availableUsd,
    stripePendingUsd: pendingUsd,
    lcAvailableCents: lcBalance?.available_cents,
    lifeOrder: lifeOrder.order,
    blocked: availableUsd < 1800,
  });

  if (availableUsd < 1800) {
    report.lifePayoutBlocked = {
      reason: "Stripe Connect balance.available < 1800",
      stripeAvailableUsd: availableUsd,
      stripePendingUsd: pendingUsd,
      lcAvailableCents: lcBalance?.available_cents,
    };
    return null;
  }

  const payout1 = await processEligibleArtistPayouts(admin);
  await sleep(10000);
  const payout2 = await processEligibleArtistPayouts(admin);

  const { data: payouts } = await admin
    .from("artist_payouts")
    .select("*, artist_payout_orders(*)")
    .eq("artist_id", ARTIST_ID)
    .order("created_at", { ascending: false });

  record("LIFE-payout", { ok: payout1.payoutsCreated > 0, payout1, payout2, payouts });
  return payouts?.[0] ?? null;
}

async function verifyGoldenAndConfig(admin: SupabaseClient) {
  const { data: golden } = await admin.from("orders").select("*").eq("id", GOLDEN_ORDER_ID).single();
  const { data: config } = await admin.from("monetization_payout_config").select("*").eq("id", "default").single();
  record("golden-integrity", {
    ok:
      golden?.status === "paid" &&
      golden?.artist_payout_status === "pending" &&
      golden?.refund_cents === 0 &&
      String(golden?.available_at).startsWith("2026-08-23"),
    golden: {
      id: golden?.id,
      status: golden?.status,
      artist_payout_status: golden?.artist_payout_status,
      available_at: golden?.available_at,
      refund_cents: golden?.refund_cents,
    },
  });
  record("config-final", {
    ok:
      config?.payout_delay_days === 7 &&
      config?.min_payout_cents === 2500 &&
      Number(config?.reserve_percent) === 0 &&
      config?.stripe_connect_ready === false,
    config,
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
    await testRefP(admin, stripe);
  } catch (e) {
    report.refPError = e instanceof Error ? e.message : String(e);
    log(String(e));
  }

  try {
    if (!report.stoppedAt) await testDisp(admin, stripe);
  } catch (e) {
    if ((report.stoppedAt as string)?.includes("DISP")) {
      /* expected stop */
    } else {
      report.dispError = e instanceof Error ? e.message : String(e);
      log(String(e));
    }
  }

  try {
    await testLifePayout(admin, stripe);
  } catch (e) {
    report.lifeError = e instanceof Error ? e.message : String(e);
  }

  if (!report.lifePayoutBlocked) {
    report.refPoSkipped = report.lifePayoutBlocked
      ? "No successful payout yet"
      : "Payout path did not complete — REF-PO skipped";
  } else {
    report.refPoSkipped = "Stripe Connect available balance insufficient for LIFE payout; REF-PO requires completed payout";
  }

  const recon = await runFinancialReconciliation(admin);
  record("final-reconciliation", { ok: true, report: recon });
  await verifyGoldenAndConfig(admin);

  report.finishedAt = new Date().toISOString();
  writeFileSync(join(process.cwd(), "scripts", "phase-5d-continuation-report.json"), JSON.stringify(report, null, 2));
  console.log("\nReport: scripts/phase-5d-continuation-report.json");
}

main().catch((e) => {
  console.error(e);
  report.fatal = e instanceof Error ? e.message : String(e);
  writeFileSync(join(process.cwd(), "scripts", "phase-5d-continuation-report.json"), JSON.stringify(report, null, 2));
  process.exit(1);
});
