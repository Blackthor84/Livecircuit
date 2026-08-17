import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

const TOUR_STOP_ID = "9fc4eebc-5502-4f16-88dc-ebe1c412a53e";
const APP_URL = "https://www.watchlivecircuit.com";

async function waitForPaid(admin: ReturnType<typeof createClient>, userId: string) {
  for (let i = 0; i < 50; i++) {
    const { data } = await admin
      .from("orders")
      .select("id, status, stripe_payment_intent_id")
      .eq("user_id", userId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.id) return data;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("timeout waiting for paid order");
}

async function main() {
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", { encoding: "utf8" });
  const service = JSON.parse(raw).keys.find((k: { name: string }) => k.name === "service_role").api_key;
  const admin = createClient("https://lblhjnzphvthnxulugep.supabase.co", service, { auth: { persistSession: false } });
  const seed = Date.now() % 100000;
  const email = `phase5d-link-${seed}@test.watchlivecircuit.com`;
  const password = `Test!${seed}Lc`;
  const { data: auth } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const userId = auth.user!.id;
  await admin.from("profiles").update({ role: "fan", is_test_account: true, onboarding_completed: true }).eq("id", userId);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();
  await page.goto(`${APP_URL}/login`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, { timeout: 90000 });
  await page.waitForTimeout(3000);
  const checkoutBody = await page.evaluate(async (tourStopId) => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ticket", tourStopId, tier: "general" }),
    });
    return await res.json();
  }, TOUR_STOP_ID);

  await page.goto(checkoutBody.url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(12000);

  // Stripe Link express checkout button lives in express checkout iframe.
  const expressFrame = page.frameLocator('iframe[title="Secure express checkout frame"]').first();
  await expressFrame.locator("button").first().click({ timeout: 20000 }).catch(async () => {
    await page.locator('button:has-text("link")').first().click({ timeout: 10000 }).catch(() => undefined);
  });
  await page.waitForTimeout(5000);

  // Link OTP / phone verification in test mode.
  for (const frame of page.frames()) {
    const otp = frame.locator('input[name="code"], input[autocomplete="one-time-code"], input[inputmode="numeric"]');
    if ((await otp.count()) > 0) {
      await otp.first().fill("000000");
      break;
    }
  }

  const phone = page.locator('input[name="phoneNumber"]');
  if ((await phone.count()) > 0) {
    await phone.fill("0000000000");
  }

  await page.getByRole("button", { name: /^Pay$/i }).click({ timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(5000);
  await page.getByRole("button", { name: /Pay|Continue|Submit/i }).click({ timeout: 15000 }).catch(() => undefined);

  const paid = await waitForPaid(admin, userId);
  console.log("paid", paid);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
