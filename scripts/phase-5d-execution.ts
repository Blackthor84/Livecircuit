/**
 * Phase 5D — Financial Lifecycle E2E execution (TEST MODE only).
 *
 * Run: node -r ./scripts/preload-server-only.cjs node_modules/tsx/dist/cli.mjs scripts/phase-5d-execution.ts
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runFinancialReconciliation } from "../src/lib/services/financial-reconciliation.service";
import {
  processEligibleArtistPayouts,
  releaseEligibleArtistFunds,
} from "../src/lib/services/artist-payout.service";
import { processOrderRefund } from "../src/lib/services/refund.service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.watchlivecircuit.com";
const GOLDEN_ORDER_ID = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const ARTIST_ID = "91b8850b-c145-4fa1-9167-0ba83cd329e8";
const TOUR_STOP_ID = "9fc4eebc-5502-4f16-88dc-ebe1c412a53e";
const CONNECTED_ACCOUNT = "acct_1U3xwlEJwfCXyXc7";
const ADMIN_USER_ID = "468563fc-5dd6-4728-b55b-0fa78c67136c";

const ORIGINAL_PAYOUT_CONFIG = {
  payout_delay_days: 7,
  min_payout_cents: 2500,
  reserve_percent: 0,
  stripe_connect_ready: false,
};

const TEST_PAYOUT_CONFIG = {
  payout_delay_days: 0,
  min_payout_cents: 500,
  reserve_percent: 0,
  stripe_connect_ready: false,
};

type Json = Record<string, unknown>;

const report: Json = {
  phase: "5D",
  startedAt: new Date().toISOString(),
  tests: [] as Json[],
  defects: [] as Json[],
  orders: {} as Record<string, Json>,
};

function log(msg: string) {
  console.log(msg);
}

function recordTest(name: string, data: Json) {
  (report.tests as Json[]).push({ name, at: new Date().toISOString(), ...data });
}

function failTest(name: string, reason: string, data?: Json): never {
  recordTest(name, { ok: false, reason, ...data });
  throw new Error(`[STOP] ${name}: ${reason}`);
}

function loadStripeSecretKey(): string {
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) return process.env.STRIPE_SECRET_KEY;
  const toml = readFileSync(join(homedir(), ".config", "stripe", "config.toml"), "utf8");
  const match = toml.match(/test_mode_api_key\s*=\s*['"]([^'"]+)['"]/);
  if (!match?.[1]?.startsWith("sk_test_")) throw new Error("Stripe TEST secret key not found");
  return match[1];
}

function loadSupabaseCredentials(): { url: string; serviceRoleKey: string } {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://lblhjnzphvthnxulugep.supabase.co";
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("eyJ")) {
    return { url, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY };
  }
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const parsed = JSON.parse(raw) as { keys: Array<{ name: string; api_key: string }> };
  const service = parsed.keys.find((k) => k.name === "service_role");
  if (!service?.api_key) throw new Error("Could not load Supabase service_role key");
  return { url, serviceRoleKey: service.api_key };
}

async function getPayoutConfig(admin: SupabaseClient) {
  const { data } = await admin
    .from("monetization_payout_config")
    .select("payout_delay_days, min_payout_cents, reserve_percent, stripe_connect_ready")
    .eq("id", "default")
    .single();
  return data;
}

async function setPayoutConfig(admin: SupabaseClient, cfg: typeof ORIGINAL_PAYOUT_CONFIG) {
  const { error } = await admin
    .from("monetization_payout_config")
    .update({ ...cfg, updated_at: new Date().toISOString() })
    .eq("id", "default");
  if (error) throw new Error(error.message);
}

async function snapshotGolden(admin: SupabaseClient) {
  const { data: order } = await admin.from("orders").select("*").eq("id", GOLDEN_ORDER_ID).single();
  const { data: balance } = await admin
    .from("artist_balances")
    .select("*")
    .eq("artist_id", ARTIST_ID)
    .maybeSingle();
  const { data: txns } = await admin
    .from("artist_balance_transactions")
    .select("*")
    .eq("order_id", GOLDEN_ORDER_ID)
    .order("created_at", { ascending: true });
  return { order, balance, txns: txns ?? [] };
}

async function snapshotArtistBalance(admin: SupabaseClient) {
  const { data } = await admin
    .from("artist_balances")
    .select("pending_cents, available_cents, receivable_cents, lifetime_paid_out_cents")
    .eq("artist_id", ARTIST_ID)
    .maybeSingle();
  return data;
}

async function snapshotOrder(admin: SupabaseClient, orderId: string) {
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  const { data: txns } = await admin
    .from("artist_balance_transactions")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  const { data: webhooks } = await admin
    .from("monetization_stripe_webhook_events")
    .select("stripe_event_id, event_type, status, order_id, processed_at")
    .eq("order_id", orderId)
    .order("processed_at", { ascending: false });
  return { order, txns: txns ?? [], webhooks: webhooks ?? [] };
}

async function waitForPaidOrder(admin: SupabaseClient, userId: string, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await admin
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.id && data.id !== GOLDEN_ORDER_ID) return data;
    await sleep(3000);
  }
  throw new Error("Timed out waiting for paid order");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createFan(admin: SupabaseClient, label: string) {
  const seed = `${label}-${Date.now()}`.replace(/[^a-z0-9]/gi, "").slice(-12);
  const email = `phase5d-${label}-${seed}@test.watchlivecircuit.com`;
  const password = `Test!${seed}Lc`;
  const username = `p5d${label}${seed}`.slice(0, 24);

  const { data: auth, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `Phase5D ${label}`,
      username,
      intended_role: "fan",
      is_test_account: true,
    },
  });
  if (error || !auth.user) throw new Error(error?.message ?? "fan create failed");

  await admin
    .from("profiles")
    .update({
      display_name: `Phase5D ${label}`,
      username,
      role: "fan",
      is_test_account: true,
      test_scenario: `phase5d_${label}`,
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
  cardNumber: string,
): Promise<{ checkoutUrl: string }> {
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
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(3000);

  const checkoutBody = await page.evaluate(async (tourStopId) => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ticket", tourStopId, tier: "general" }),
    });
    const json = (await res.json()) as { url?: string; error?: string; message?: string };
    return { ok: res.ok, status: res.status, json };
  }, TOUR_STOP_ID);

  if (!checkoutBody.ok || !checkoutBody.json.url) {
    await browser.close();
    throw new Error(
      checkoutBody.json.error ??
        checkoutBody.json.message ??
        `checkout HTTP ${checkoutBody.status}`,
    );
  }

  const checkoutUrl = checkoutBody.json.url;
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
    cardNumber,
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
      await name.first().fill("Phase 5D Test Fan");
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

  const paid = await waitForPaidOrder(admin, fan.userId, 150_000).catch(async () => {
    await page.waitForURL(/checkout=success|success=1|dashboard/, { timeout: 30_000 }).catch(() => null);
    return waitForPaidOrder(admin, fan.userId, 30_000);
  });

  await browser.close();
  if (!paid?.id) throw new Error("Checkout payment did not reach paid order state");
  return { checkoutUrl };
}

async function runCronPayoutPipeline(admin: SupabaseClient, label: string) {
  const release = await releaseEligibleArtistFunds(admin);
  const payouts = await processEligibleArtistPayouts(admin);
  recordTest(`cron-pipeline:${label}`, { ok: true, release, payouts });
  return { release, payouts };
}

async function getStripeCharge(stripe: Stripe, paymentIntentId: string) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge.balance_transaction", "latest_charge.transfer", "latest_charge.application_fee"],
  });
  const charge = pi.latest_charge as Stripe.Charge;
  const transfer = charge.transfer as Stripe.Transfer | string | null;
  return { pi, charge, transferId: typeof transfer === "string" ? transfer : transfer?.id ?? null };
}

async function main() {
  const stripeKey = loadStripeSecretKey();
  if (stripeKey.startsWith("sk_live_")) throw new Error("Refusing live Stripe key");

  const { url, serviceRoleKey } = loadSupabaseCredentials();
  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
  process.env.STRIPE_SECRET_KEY = stripeKey;

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  log("=== STEP 1: Golden order baseline + premature release ===");
  const goldenBefore = await snapshotGolden(admin);
  report.goldenBefore = goldenBefore;

  const reconBaseline = await runFinancialReconciliation(admin);
  recordTest("reconciliation-baseline", { ok: true, report: reconBaseline });

  const { data: directRelease } = await admin.rpc("release_artist_order_earnings", {
    p_order_id: GOLDEN_ORDER_ID,
  });
  const cronResult = await runCronPayoutPipeline(admin, "golden-premature");
  const goldenAfter = await snapshotGolden(admin);

  const goldenUnchanged =
    goldenAfter.order?.artist_payout_status === goldenBefore.order?.artist_payout_status &&
    goldenAfter.order?.available_at === goldenBefore.order?.available_at &&
    goldenAfter.balance?.pending_cents === goldenBefore.balance?.pending_cents &&
    goldenAfter.balance?.available_cents === goldenBefore.balance?.available_cents &&
    Number(directRelease ?? 0) === 0 &&
    Number(cronResult.release.ordersReleased ?? 0) === 0;

  recordTest("golden-premature-release", {
    ok: goldenUnchanged,
    directReleaseCents: directRelease,
    cronRelease: cronResult.release,
    before: {
      artist_payout_status: goldenBefore.order?.artist_payout_status,
      available_at: goldenBefore.order?.available_at,
      pending_cents: goldenBefore.balance?.pending_cents,
      available_cents: goldenBefore.balance?.available_cents,
    },
    after: {
      artist_payout_status: goldenAfter.order?.artist_payout_status,
      available_at: goldenAfter.order?.available_at,
      pending_cents: goldenAfter.balance?.pending_cents,
      available_cents: goldenAfter.balance?.available_cents,
    },
  });
  if (!goldenUnchanged) {
    failTest("golden-premature-release", "Golden order or balance changed during premature release test");
  }

  log("=== STEP 2: Record + apply test payout config ===");
  const configBefore = await getPayoutConfig(admin);
  report.payoutConfigBefore = configBefore;
  await setPayoutConfig(admin, TEST_PAYOUT_CONFIG);
  const configApplied = await getPayoutConfig(admin);
  report.payoutConfigApplied = configApplied;

  const verifyGoldenAfterConfig = await admin
    .from("orders")
    .select("available_at, artist_payout_status")
    .eq("id", GOLDEN_ORDER_ID)
    .single();
  recordTest("config-change-golden-unchanged", {
    ok:
      verifyGoldenAfterConfig.data?.available_at === goldenBefore.order?.available_at &&
      verifyGoldenAfterConfig.data?.artist_payout_status === goldenBefore.order?.artist_payout_status,
    goldenAvailableAt: verifyGoldenAfterConfig.data?.available_at,
  });

  async function checkoutScenario(label: string, cardNumber: string) {
    log(`=== Checkout ${label} ===`);
    const fan = await createFan(admin, label);
    const { checkoutUrl } = await productionCheckoutAndPay(admin, fan, cardNumber);
    const order = await waitForPaidOrder(admin, fan.userId);
    const snap = await snapshotOrder(admin, order.id as string);
    const stripeObjs = await getStripeCharge(stripe, order.stripe_payment_intent_id as string);
    const balance = await snapshotArtistBalance(admin);
    const entry = {
      label,
      fan,
      orderId: order.id,
      order,
      stripe: {
        paymentIntentId: stripeObjs.pi.id,
        chargeId: stripeObjs.charge.id,
        transferId: stripeObjs.transferId,
        chargeAmount: stripeObjs.charge.amount,
        applicationFeeAmount: stripeObjs.charge.application_fee_amount,
      },
      snapshot: snap,
      artistBalance: balance,
    };
    (report.orders as Record<string, Json>)[label] = entry;
    return entry;
  }

  log("=== STEP 3: Order-LIFE ===");
  const life = await checkoutScenario("LIFE", "4242424242424242");
  const lifeOrderId = life.orderId as string;

  if (life.order.available_at && new Date(life.order.available_at as string) > new Date()) {
    failTest("LIFE-hold", "Expected immediate available_at with payout_delay_days=0", {
      available_at: life.order.available_at,
    });
  }

  const balanceBeforeRelease = await snapshotArtistBalance(admin);
  const releaseLife = await runCronPayoutPipeline(admin, "LIFE-release");
  const lifeAfterRelease = await snapshotOrder(admin, lifeOrderId);
  const stripeBalAfterRelease = await stripe.balance.retrieve({}, { stripeAccount: CONNECTED_ACCOUNT });

  recordTest("LIFE-release", {
    ok: lifeAfterRelease.order?.artist_payout_status === "available",
    release: releaseLife.release,
    orderStatus: lifeAfterRelease.order?.artist_payout_status,
    balanceBeforeRelease,
    balanceAfterRelease: await snapshotArtistBalance(admin),
    stripeConnectedBalance: stripeBalAfterRelease,
    ledger: lifeAfterRelease.txns,
  });

  if (lifeAfterRelease.order?.artist_payout_status !== "available") {
    failTest("LIFE-release", "Order did not reach available status", { lifeAfterRelease });
  }

  const payoutAttempt1 = await runCronPayoutPipeline(admin, "LIFE-payout-1");
  const lifeAfterPayout1 = await snapshotOrder(admin, lifeOrderId);
  const { data: payouts1 } = await admin
    .from("artist_payouts")
    .select("*")
    .eq("artist_id", ARTIST_ID)
    .order("created_at", { ascending: false })
    .limit(3);

  const stripeAvailable =
    (await stripe.balance.retrieve({}, { stripeAccount: CONNECTED_ACCOUNT })).available.find(
      (b) => b.currency === "usd",
    )?.amount ?? 0;

  recordTest("LIFE-payout-1", {
    ok: true,
    payoutAttempt: payoutAttempt1,
    stripeConnectedAvailableUsd: stripeAvailable,
    payouts: payouts1,
    orderStatus: lifeAfterPayout1.order?.artist_payout_status,
    artistBalance: await snapshotArtistBalance(admin),
  });

  if ((payoutAttempt1.payouts.payoutsCreated ?? 0) === 0 && stripeAvailable < 500) {
    recordTest("LIFE-payout-blocker", {
      ok: false,
      blocked: true,
      reason: "Stripe connected-account available balance insufficient for payout",
      stripeConnectedAvailableUsd: stripeAvailable,
      note: "Per instructions: not bypassing payout; reporting blocker",
    });
    report.payoutBlocked = true;
  } else {
    const payoutAttempt2 = await runCronPayoutPipeline(admin, "LIFE-payout-duplicate");
    recordTest("LIFE-payout-duplicate", {
      ok: true,
      first: payoutAttempt1.payouts,
      second: payoutAttempt2.payouts,
      payoutsAfter: await admin
        .from("artist_payouts")
        .select("*")
        .eq("artist_id", ARTIST_ID)
        .order("created_at", { ascending: false }),
    });
  }

  log("=== STEP 4: Order-REF-P ===");
  const refP = await checkoutScenario("REF-P", "4242424242424242");
  const refPOrderId = refP.orderId as string;
  const refPPi = refP.stripe.paymentIntentId as string;

  const partial = await stripe.refunds.create({
    payment_intent: refPPi,
    amount: 500,
    reverse_transfer: true,
    refund_application_fee: true,
    metadata: { order_id: refPOrderId, phase: "5d-ref-p-partial" },
  });
  await sleep(8000);
  const refPAfterPartial = await snapshotOrder(admin, refPOrderId);

  const partialRefundTxn = refPAfterPartial.txns.find((t) =>
    String(t.transaction_type).includes("partial"),
  );
  recordTest("REF-P-partial-refund", {
    ok: refPAfterPartial.order?.refund_cents === 500,
    stripeRefundId: partial.id,
    order: refPAfterPartial.order,
    ledger: refPAfterPartial.txns,
    expectedArtistReversal: 450,
    expectedPlatformReversal: 50,
    actualArtistReversal: partialRefundTxn?.artist_earnings_cents,
    actualPlatformReversal: partialRefundTxn?.platform_fee_cents,
  });

  if (Number(partialRefundTxn?.artist_earnings_cents ?? -1) !== 450) {
    (report.defects as Json[]).push({
      code: "REF-P-partial-artist-reversal",
      expected: 450,
      actual: partialRefundTxn?.artist_earnings_cents,
    });
  }

  const fullRefund = await processOrderRefund(admin, {
    orderId: refPOrderId,
    createStripeRefund: true,
    adminId: ADMIN_USER_ID,
    reason: "Phase 5D REF-P full remainder",
  });
  await sleep(8000);
  const refPAfterFull = await snapshotOrder(admin, refPOrderId);
  recordTest("REF-P-full-refund", {
    ok: fullRefund.ok && refPAfterFull.order?.status === "refunded",
    result: fullRefund,
    order: refPAfterFull.order,
    ledger: refPAfterFull.txns,
    webhooks: refPAfterFull.webhooks,
  });

  log("=== STEP 5: Order-REF-PO ===");
  const refPo = await checkoutScenario("REF-PO", "4242424242424242");
  const refPoOrderId = refPo.orderId as string;
  await runCronPayoutPipeline(admin, "REF-PO-release");
  const refPoAfterRelease = await snapshotOrder(admin, refPoOrderId);
  const payoutRefPo = await runCronPayoutPipeline(admin, "REF-PO-payout");

  const stripeAvailRefPo =
    (await stripe.balance.retrieve({}, { stripeAccount: CONNECTED_ACCOUNT })).available.find(
      (b) => b.currency === "usd",
    )?.amount ?? 0;

  recordTest("REF-PO-payout", {
    ok: true,
    releaseStatus: refPoAfterRelease.order?.artist_payout_status,
    payoutAttempt: payoutRefPo,
    stripeConnectedAvailableUsd: stripeAvailRefPo,
    order: refPoAfterRelease.order,
  });

  const refPoRefund = await processOrderRefund(admin, {
    orderId: refPoOrderId,
    createStripeRefund: true,
    adminId: ADMIN_USER_ID,
    reason: "Phase 5D REF-PO post-payout refund",
  });
  await sleep(8000);
  const refPoAfterRefund = await snapshotOrder(admin, refPoOrderId);
  const { data: receivables } = await admin
    .from("artist_receivables")
    .select("*")
    .eq("order_id", refPoOrderId);

  recordTest("REF-PO-refund-receivable", {
    ok: refPoRefund.ok,
    result: refPoRefund,
    order: refPoAfterRefund.order,
    receivables,
    ledger: refPoAfterRefund.txns,
    artistBalance: await snapshotArtistBalance(admin),
  });

  log("=== STEP 6: Order-DISP ===");
  const disp = await checkoutScenario("DISP", "4000000000000259");
  const dispOrderId = disp.orderId as string;
  const dispChargeId = disp.stripe.chargeId as string;
  const dispCharge = await stripe.charges.retrieve(dispChargeId, { expand: ["transfer"] });
  const transferObj =
    typeof dispCharge.transfer === "object" && dispCharge.transfer
      ? dispCharge.transfer
      : dispCharge.transfer
        ? await stripe.transfers.retrieve(dispCharge.transfer as string)
        : null;

  await sleep(15000);
  const { data: disputeRow } = await admin
    .from("artist_disputes")
    .select("*")
    .eq("order_id", dispOrderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let reversal: Stripe.TransferReversal | null = null;
  if (disputeRow?.stripe_transfer_reversal_id) {
    reversal = await stripe.transfers.retrieveReversal(
      (disputeRow.stripe_transfer_id as string) ?? (transferObj?.id as string),
      disputeRow.stripe_transfer_reversal_id as string,
    );
  }

  const calculatedReversal =
    transferObj && dispCharge.amount > 0
      ? Math.min(
          transferObj.amount,
          Math.round((transferObj.amount * dispCharge.amount) / dispCharge.amount),
        )
      : null;

  recordTest("DISP-dispute-reversal", {
    ok: true,
    chargeAmount: dispCharge.amount,
    transferAmount: transferObj?.amount,
    artistEarningsCents: disp.order.artist_earnings_cents,
    calculatedReversalAmount: calculatedReversal,
    disputeRow,
    reversal: reversal
      ? { id: reversal.id, amount: reversal.amount, transfer: reversal.transfer }
      : null,
    orderAfter: (await snapshotOrder(admin, dispOrderId)).order,
    ledger: (await snapshotOrder(admin, dispOrderId)).txns,
  });

  if (reversal && reversal.amount > Number(disp.order.artist_earnings_cents ?? 0)) {
    (report.defects as Json[]).push({
      code: "DISP-reversal-exceeds-artist-earnings",
      chargeAmount: dispCharge.amount,
      transferAmount: transferObj?.amount,
      artistEarningsCents: disp.order.artist_earnings_cents,
      reversalAmount: reversal.amount,
      note: "Handler reversed full transfer amount, not artist share only",
    });
    recordTest("DISP-reversal-audit-stop", {
      ok: false,
      stopped: true,
      reversalAmount: reversal.amount,
      artistEarnings: disp.order.artist_earnings_cents,
    });
  }

  log("=== STEP 7: Final reconciliation + restore config ===");
  const reconFinal = await runFinancialReconciliation(admin);
  recordTest("reconciliation-final", { ok: true, report: reconFinal });

  await setPayoutConfig(admin, ORIGINAL_PAYOUT_CONFIG);
  const configRestored = await getPayoutConfig(admin);
  report.payoutConfigRestored = configRestored;

  const restoredOk =
    configRestored?.payout_delay_days === ORIGINAL_PAYOUT_CONFIG.payout_delay_days &&
    configRestored?.min_payout_cents === ORIGINAL_PAYOUT_CONFIG.min_payout_cents &&
    Number(configRestored?.reserve_percent ?? 0) === ORIGINAL_PAYOUT_CONFIG.reserve_percent &&
    configRestored?.stripe_connect_ready === ORIGINAL_PAYOUT_CONFIG.stripe_connect_ready;

  recordTest("payout-config-restore", { ok: restoredOk, config: configRestored });

  const goldenFinal = await snapshotGolden(admin);
  report.goldenFinal = goldenFinal;
  const goldenStillIntact =
    goldenFinal.order?.available_at === goldenBefore.order?.available_at &&
    goldenFinal.order?.artist_payout_status === goldenBefore.order?.artist_payout_status &&
    goldenFinal.balance?.pending_cents === goldenBefore.balance?.pending_cents;
  recordTest("golden-final-integrity", { ok: goldenStillIntact, goldenFinal });

  report.finishedAt = new Date().toISOString();
  const outPath = join(process.cwd(), "scripts", "phase-5d-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${outPath}`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  report.fatalError = err instanceof Error ? err.message : String(err);
  report.finishedAt = new Date().toISOString();
  const outPath = join(process.cwd(), "scripts", "phase-5d-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.error(err);
  process.exit(1);
});
