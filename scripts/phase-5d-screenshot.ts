import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", {
    encoding: "utf8",
  });
  const service = JSON.parse(raw).keys.find((k: { name: string }) => k.name === "service_role").api_key;
  const admin = createClient("https://lblhjnzphvthnxulugep.supabase.co", service);
  const seed = Date.now() % 100000;
  const email = `p5d-screenshot-${seed}@test.watchlivecircuit.com`;
  const password = `Test!${seed}Lc`;
  await admin.auth.admin.createUser({ email, password, email_confirm: true });

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.watchlivecircuit.com/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 90_000,
  });
  await page.waitForTimeout(3000);
  const c = await page.evaluate(async () => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ticket",
        tourStopId: "9fc4eebc-5502-4f16-88dc-ebe1c412a53e",
        tier: "general",
      }),
    });
    return await res.json();
  });
  console.log("session", c.url?.slice(0, 80));
  await page.goto(c.url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(12_000);
  await page.screenshot({ path: "scripts/checkout-page.png", fullPage: true });
  const text = await page.locator("body").innerText();
  writeFileSync("scripts/checkout-page.txt", text);
  console.log("frames", page.frames().length);
  for (const f of page.frames()) console.log("frame", f.url().slice(0, 140));
  console.log(text.slice(0, 2000));
  await browser.close();
}

main().catch(console.error);
