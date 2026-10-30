/**
 * FastPay staging sign-off evidence collector (READ-ONLY on protected orders).
 * Run: npx tsx scripts/fastpay-staging-signoff.ts
 * Requires: STRIPE_SECRET_KEY (sk_test_*) or Stripe CLI test_mode_api_key
 * Uses Supabase project ref from LIVECIRCUIT_STAGING_PROJECT_REF or default dev ref in Phase 5 scripts.
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const GOLDEN = "78581ea3-0b38-47b7-b981-6cc94fc7d057";
const LIFE = "2d9d1586-10f9-4255-a47b-d962962d343b";
const HIST_DISP = "56d3952c-43bc-4457-9a4d-e7a50deaec50";
const FRESH_DISP = "0d4e711f-970f-494d-bd54-56f18c3dbda5";
const DEFAULT_PROJECT_REF = "lblhjnzphvthnxulugep";

function loadStripeKey(): { key: string; source: string } {
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
    return { key: process.env.STRIPE_SECRET_KEY, source: "STRIPE_SECRET_KEY" };
  }
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")) {
    throw new Error("Refusing to run: STRIPE_SECRET_KEY is live mode. Use sk_test_ only.");
  }
  const tomlPath = join(homedir(), ".config", "stripe", "config.toml");
  const toml = readFileSync(tomlPath, "utf8");
  const key = toml.match(/test_mode_api_key\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (!key?.startsWith("sk_test_")) throw new Error("TEST Stripe key required");
  return { key, source: "stripe-cli-config.toml" };
}

function loadSupabaseAdmin() {
  const ref = process.env.LIVECIRCUIT_STAGING_PROJECT_REF ?? DEFAULT_PROJECT_REF;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? `https://${ref}.supabase.co`;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url,
      ref,
      admin: createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }),
    };
  }
  const raw = execSync(`npx supabase projects api-keys --project-ref ${ref}`, { encoding: "utf8" });
  const key = JSON.parse(raw).keys.find((k: { name: string }) => k.name === "service_role").api_key;
  return { url, ref, admin: createClient(url, key, { auth: { persistSession: false } }) };
}

async function main() {
  const report: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    branch: "feature/fastpay-phase4",
  };

  const stripeCreds = loadStripeKey();
  report.stripe = {
    keySource: stripeCreds.source,
    mode: "test",
    keyPrefix: stripeCreds.key.slice(0, 12) + "…",
  };

  const { url, ref, admin } = loadSupabaseAdmin();
  report.supabase = { projectRef: ref, url };

  const stripe = new Stripe(stripeCreds.key, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  const [
    flagRes,
    commissionRes,
    payoutConfigRes,
    protectedOrdersRes,
    migrationProbe,
  ] = await Promise.all([
    admin.from("monetization_feature_flags").select("flag_key, is_enabled, visibility").eq("flag_key", "artist_fastpay").maybeSingle(),
    admin.from("monetization_commission_config").select("*").eq("id", "default").maybeSingle(),
    admin.from("monetization_payout_config").select("payout_delay_days, min_payout_cents, reserve_percent, max_payout_cents").eq("id", "default").maybeSingle(),
    admin
      .from("orders")
      .select(
        "id, status, artist_payout_status, payout_eligibility_policy, available_at, payment_success_at, remaining_artist_earnings_cents, refund_cents",
      )
      .in("id", [GOLDEN, LIFE, HIST_DISP, FRESH_DISP]),
    admin.from("orders").select("payout_eligibility_policy, event_id").limit(1),
  ]);

  report.migrations = {
    commissionConfigTable: commissionRes.error ? { ok: false, error: commissionRes.error.message } : { ok: true, row: commissionRes.data },
    ordersFastPayColumns: migrationProbe.error
      ? { ok: false, error: migrationProbe.error.message }
      : { ok: true, sample: migrationProbe.data?.[0] ?? null },
  };

  report.artistFastPayFlag = flagRes.data ?? flagRes.error?.message ?? null;
  report.payoutConfig = payoutConfigRes.data ?? payoutConfigRes.error?.message;
  report.protectedOrders = protectedOrdersRes.data ?? protectedOrdersRes.error?.message;

  const heldFastPay = await admin
    .from("orders")
    .select("id, artist_payout_status, payout_eligibility_policy, metadata")
    .eq("payout_eligibility_policy", "fastpay")
    .eq("artist_payout_status", "held")
    .limit(10);

  report.fastPayHeldSample = heldFastPay.data ?? [];

  const connectId = "acct_1U3xwlEJwfCXyXc7";
  try {
    const balance = await stripe.balance.retrieve({}, { stripeAccount: connectId });
    report.stripeConnectBalance = {
      account: connectId,
      availableUsd: balance.available.find((b) => b.currency === "usd")?.amount ?? 0,
      pendingUsd: balance.pending.find((b) => b.currency === "usd")?.amount ?? 0,
    };
  } catch (e) {
    report.stripeConnectBalance = { error: e instanceof Error ? e.message : String(e) };
  }

  const outPath = join(process.cwd(), "scripts", "fastpay-staging-signoff-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
