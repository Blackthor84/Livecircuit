import Stripe from "stripe";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

function loadStripeSecretKey(): string {
  const toml = readFileSync(join(homedir(), ".config", "stripe", "config.toml"), "utf8");
  return toml.match(/test_mode_api_key\s*=\s*['"]([^'"]+)['"]/)?.[1]!;
}

async function completeHostedCheckout(stripe: Stripe, sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const checkoutUrl = session.url;
  if (!checkoutUrl) throw new Error("missing url");
  console.log("url", checkoutUrl.slice(0, 100));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(checkoutUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(5000);

  await page.locator('[data-testid="card-accordion-item-button"]').click({ timeout: 30_000 }).catch(async () => {
    await page.locator("#payment-method-accordion-item-title-card").click({ force: true });
  });
  await page.waitForTimeout(5000);

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

  const n = await fillFirstMatch(['input[name="number"]', '[placeholder*="1234"]', '[autocomplete="cc-number"]', '#cardNumber'], "4242424242424242");
  const e = await fillFirstMatch(['input[name="expiry"]', '[placeholder*="MM"]', '[autocomplete="cc-exp"]', '#cardExpiry'], "1234");
  const c = await fillFirstMatch(['input[name="cvc"]', '[placeholder*="CVC"]', '[autocomplete="cc-csc"]', '#cardCvc'], "123");
  console.log("filled", { n, e, c });

  for (const frame of page.frames()) {
    const name = frame.locator(
      'input[name="name"], input[autocomplete="cc-name"], input[placeholder*="Full name"], input[aria-label*="name on card"]',
    );
    if ((await name.count()) > 0) {
      await name.first().fill("Phase 5D Test Fan");
      break;
    }
  }

  await page.getByRole("checkbox").first().uncheck().catch(() => undefined);

  for (const frame of page.frames()) {
    const postal = frame.locator('[name="postalCode"], [placeholder*="ZIP"], [autocomplete="postal-code"]').first();
    if ((await postal.count()) > 0) {
      await postal.fill("12345");
      break;
    }
  }

  await page.getByTestId("hosted-payment-submit-button").click({ timeout: 30_000 });
  for (let i = 0; i < 40; i++) {
    const updated = await stripe.checkout.sessions.retrieve(sessionId);
    if (updated.payment_status === "paid") {
      console.log("PAID", updated.payment_intent);
      await browser.close();
      return;
    }
    await page.waitForTimeout(3000);
  }
  const errText = await page.locator('[role="alert"], .FieldError, .Error').allTextContents().catch(() => []);
  console.log("errors", errText);
  console.log("final url", page.url());
  await page.screenshot({ path: "scripts/checkout-after-submit.png", fullPage: true });
  await browser.close();
  const updated = await stripe.checkout.sessions.retrieve(sessionId);
  console.log("session status", updated.status, updated.payment_status);
}

const stripe = new Stripe(loadStripeSecretKey(), { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });
completeHostedCheckout(stripe, process.argv[2] ?? "cs_test_a1QuNKS1jQYVfIciqMOgEACuklfg8aCjWavhwP2v7WPNNpyqjcEMCBcNut").catch(console.error);
