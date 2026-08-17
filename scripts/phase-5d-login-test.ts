import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", {
    encoding: "utf8",
  });
  const parsed = JSON.parse(raw) as { keys: Array<{ name: string; api_key: string }> };
  const service = parsed.keys.find((k) => k.name === "service_role")?.api_key;
  const url = "https://lblhjnzphvthnxulugep.supabase.co";
  const admin = createClient(url, service!, { auth: { persistSession: false } });
  const seed = Date.now() % 100000;
  const email = `phase5d-login-test-${seed}@test.watchlivecircuit.com`;
  const password = `Test!${seed}Lc`;
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  console.log("create", error?.message ?? "ok");

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
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(3000);
  console.log("url", page.url());
  const checkout = await page.evaluate(async () => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ticket",
        tourStopId: "9fc4eebc-5502-4f16-88dc-ebe1c412a53e",
        tier: "general",
      }),
    });
    return { status: res.status, body: await res.json() };
  });
  console.log(JSON.stringify(checkout, null, 2));
  await browser.close();
}

main().catch(console.error);
