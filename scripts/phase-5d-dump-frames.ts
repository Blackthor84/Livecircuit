import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", { encoding: "utf8" });
  const service = JSON.parse(raw).keys.find((k: { name: string }) => k.name === "service_role").api_key;
  const admin = createClient("https://lblhjnzphvthnxulugep.supabase.co", service);
  const seed = Date.now() % 100000;
  const email = `phase5d-nested-${seed}@test.watchlivecircuit.com`;
  const password = `Test!${seed}Lc`;
  await admin.auth.admin.createUser({ email, password, email_confirm: true });

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.watchlivecircuit.com/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, { timeout: 90000 });
  await page.waitForTimeout(3000);
  const c = await page.evaluate(async () => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ticket", tourStopId: "9fc4eebc-5502-4f16-88dc-ebe1c412a53e", tier: "general" }),
    });
    return await res.json();
  });
  await page.goto(c.url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(12000);
  await page.locator('input[name="payment-method-accordion-item-title"]').nth(0).click({ force: true });
  await page.waitForTimeout(5000);

  for (const frame of page.frames()) {
    if (!frame.url().includes("elements-inner-payment")) continue;
    console.log("PAYMENT FRAME", frame.url().slice(0, 140));
    const inputs = frame.locator("input");
    console.log(" inputs", await inputs.count());
    for (let i = 0; i < Math.min(await inputs.count(), 6); i++) {
      console.log(
        i,
        await inputs.nth(i).getAttribute("name"),
        await inputs.nth(i).getAttribute("placeholder"),
        await inputs.nth(i).getAttribute("aria-label"),
      );
    }
  }

  console.log(
    "all frame urls",
    page.frames().map((f) => f.url().slice(0, 100)),
  );
  await browser.close();
}

main().catch(console.error);
