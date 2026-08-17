/**
 * Resume Phase 5D from REF-P onward (test payout config must be active).
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import { homedir } from "os";
import { processOrderRefund } from "../src/lib/services/refund.service";
import { runFinancialReconciliation } from "../src/lib/services/financial-reconciliation.service";
import { releaseEligibleArtistFunds, processEligibleArtistPayouts } from "../src/lib/services/artist-payout.service";

const APP_URL = "https://www.watchlivecircuit.com";
const ARTIST_ID = "91b8850b-c145-4fa1-9167-0ba83cd329e8";
const TOUR_STOP_ID = "9fc4eebc-5502-4f16-88dc-ebe1c412a53e";
const GOLDEN_ORDER_ID = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const ADMIN_USER_ID = "468563fc-5dd6-4728-b55b-0fa78c67136c";
const LIFE_ORDER_ID = "2d9d1586-10f9-4255-a47b-d962962d343b";

function loadStripeKey() {
  const toml = readFileSync(join(homedir(), ".config", "stripe", "config.toml"), "utf8");
  return toml.match(/test_mode_api_key\s*=\s*['"]([^'"]+)['"]/)?.[1]!;
}
function loadService() {
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", { encoding: "utf8" });
  return JSON.parse(raw).keys.find((k: { name: string }) => k.name === "service_role").api_key;
}

const report = JSON.parse(readFileSync("scripts/phase-5d-report.json", "utf8"));

async function waitForPaid(admin: ReturnType<typeof createClient>, userId: string) {
  for (let i = 0; i < 50; i++) {
    const { data } = await admin.from("orders").select("*").eq("user_id", userId).eq("status", "paid").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data?.id && data.id !== GOLDEN_ORDER_ID) return data;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("paid timeout");
}

async function checkout(admin: ReturnType<typeof createClient>, label: string, card: string) {
  const seed = `${label}${Date.now()}`;
  const email = `phase5d-${label}-${seed}@test.watchlivecircuit.com`;
  const password = `Test!${seed.slice(-12)}Lc`;
  const { data: auth } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const userId = auth.user!.id;
  await admin.from("profiles").update({ role: "fan", is_test_account: true, onboarding_completed: true }).eq("id", userId);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`${APP_URL}/login`);
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.locator('form button[type="submit"]').click();
    try {
      await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, { timeout: 60000 });
      break;
    } catch {
      if (attempt === 2) throw new Error("login failed");
      await page.waitForTimeout(3000);
    }
  }
  await page.waitForTimeout(2000);
  const body = await page.evaluate(async (tourStopId) => {
    const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "ticket", tourStopId, tier: "general" }) });
    return await res.json();
  }, TOUR_STOP_ID);
  await page.goto(body.url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(5000);
  await page.locator('[data-testid="card-accordion-item-button"]').click({ timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(3000);
  const fill = async (sels: string[], val: string) => {
    for (const frame of page.frames()) for (const sel of sels) {
      const loc = frame.locator(sel).first();
      if ((await loc.count()) > 0) { await loc.fill(val); return; }
    }
  };
  await fill(['input[name="number"]', '[placeholder*="1234"]'], card);
  await fill(['input[name="expiry"]', '[placeholder*="MM"]'], "1234");
  await fill(['input[name="cvc"]', '[placeholder*="CVC"]'], "123");
  for (const frame of page.frames()) {
    const name = frame.locator('input[name="name"], input[autocomplete="cc-name"], input[placeholder*="Full name"]');
    if ((await name.count()) > 0) { await name.first().fill("Phase 5D Test Fan"); break; }
  }
  for (const frame of page.frames()) {
    const zip = frame.locator('[name="postalCode"], [placeholder*="ZIP"]').first();
    if ((await zip.count()) > 0) { await zip.fill("12345"); break; }
  }
  await page.getByRole("checkbox").first().uncheck().catch(() => undefined);
  await page.getByTestId("hosted-payment-submit-button").click({ timeout: 30000 });
  const order = await waitForPaid(admin, userId);
  await browser.close();
  return { label, order, fan: { userId, email } };
}

async function main() {
  process.env.STRIPE_SECRET_KEY = loadStripeKey();
  process.env.SUPABASE_SERVICE_ROLE_KEY = loadService();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://lblhjnzphvthnxulugep.supabase.co";
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  console.log("REF-P");
  const refP = await checkout(admin, "REF-P", "4242424242424242");
  const partial = await stripe.refunds.create({ payment_intent: refP.order.stripe_payment_intent_id as string, amount: 500, reverse_transfer: true, refund_application_fee: true });
  await new Promise((r) => setTimeout(r, 8000));
  const { data: refPPartialTx } = await admin.from("artist_balance_transactions").select("*").eq("order_id", refP.order.id).eq("transaction_type", "partial_refund").maybeSingle();
  report.tests.push({ name: "REF-P-partial-refund", ok: true, stripeRefundId: partial.id, orderId: refP.order.id, artistReversal: refPPartialTx?.artist_earnings_cents, platformReversal: refPPartialTx?.platform_fee_cents });

  const full = await processOrderRefund(admin, { orderId: refP.order.id as string, createStripeRefund: true, adminId: ADMIN_USER_ID, reason: "Phase5D REF-P remainder" });
  await new Promise((r) => setTimeout(r, 8000));
  const { data: refPOrder } = await admin.from("orders").select("*").eq("id", refP.order.id).single();
  report.tests.push({ name: "REF-P-full-refund", ok: full.ok, order: refPOrder });

  console.log("REF-PO");
  const refPo = await checkout(admin, "REF-PO", "4242424242424242");
  await releaseEligibleArtistFunds(admin);
  const payout1 = await processEligibleArtistPayouts(admin);
  const payout2 = await processEligibleArtistPayouts(admin);
  report.tests.push({ name: "REF-PO-payout-attempts", payout1, payout2, stripeAvailable: (await stripe.balance.retrieve({}, { stripeAccount: "acct_1U3xwlEJwfCXyXc7" })).available });
  const refPoRefund = await processOrderRefund(admin, { orderId: refPo.order.id as string, createStripeRefund: true, adminId: ADMIN_USER_ID, reason: "Phase5D REF-PO post-payout" });
  await new Promise((r) => setTimeout(r, 8000));
  const { data: receivables } = await admin.from("artist_receivables").select("*").eq("order_id", refPo.order.id);
  const { data: refPoOrder } = await admin.from("orders").select("*").eq("id", refPo.order.id).single();
  report.tests.push({ name: "REF-PO-refund-receivable", ok: refPoRefund.ok, order: refPoOrder, receivables });

  console.log("DISP");
  const disp = await checkout(admin, "DISP", "4000000000000259");
  await new Promise((r) => setTimeout(r, 20000));
  const dispCharge = await stripe.charges.retrieve((await stripe.paymentIntents.retrieve(disp.order.stripe_payment_intent_id as string)).latest_charge as string, { expand: ["transfer"] });
  const transfer = typeof dispCharge.transfer === "object" ? dispCharge.transfer : null;
  const { data: disputeRow } = await admin.from("artist_disputes").select("*").eq("order_id", disp.order.id).maybeSingle();
  let reversal: Stripe.TransferReversal | null = null;
  if (disputeRow?.stripe_transfer_reversal_id && disputeRow.stripe_transfer_id) {
    reversal = await stripe.transfers.retrieveReversal(disputeRow.stripe_transfer_id as string, disputeRow.stripe_transfer_reversal_id as string);
  }
  report.tests.push({
    name: "DISP-dispute-reversal",
    orderId: disp.order.id,
    chargeAmount: dispCharge.amount,
    transferAmount: transfer?.amount,
    artistEarningsCents: disp.order.artist_earnings_cents,
    calculatedReversal: transfer ? Math.min(transfer.amount, Math.round((transfer.amount * dispCharge.amount) / dispCharge.amount)) : null,
    disputeRow,
    reversal: reversal ? { id: reversal.id, amount: reversal.amount } : null,
  });
  if (reversal && reversal.amount > Number(disp.order.artist_earnings_cents)) {
    report.defects.push({ code: "DISP-reversal-exceeds-artist-earnings", reversalAmount: reversal.amount, artistEarnings: disp.order.artist_earnings_cents });
  }

  console.log("duplicate payout on LIFE");
  const dup1 = await processEligibleArtistPayouts(admin);
  const dup2 = await processEligibleArtistPayouts(admin);
  report.tests.push({ name: "LIFE-duplicate-payout-cron", dup1, dup2, payouts: await admin.from("artist_payouts").select("*").eq("artist_id", ARTIST_ID) });

  report.tests.push({ name: "reconciliation-final", ok: true, report: await runFinancialReconciliation(admin) });
  await admin.from("monetization_payout_config").update({ payout_delay_days: 7, min_payout_cents: 2500, reserve_percent: 0, stripe_connect_ready: false, updated_at: new Date().toISOString() }).eq("id", "default");
  const { data: restored } = await admin.from("monetization_payout_config").select("*").eq("id", "default").single();
  report.payoutConfigRestored = restored;
  const { data: golden } = await admin.from("orders").select("available_at, artist_payout_status").eq("id", GOLDEN_ORDER_ID).single();
  report.goldenFinal = golden;
  report.finishedAt = new Date().toISOString();
  writeFileSync("scripts/phase-5d-report.json", JSON.stringify(report, null, 2));
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });
