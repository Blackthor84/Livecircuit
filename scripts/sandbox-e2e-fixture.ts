/**
 * Phase 5B — controlled Stripe Sandbox E2E fixture (TEST MODE only).
 * Uses application services + Testing Center patterns. Does not insert fake orders or Stripe IDs.
 *
 * Run (credentials loaded from env or Stripe/Supabase CLI):
 *   npx tsx scripts/sandbox-e2e-fixture.ts
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createStandaloneEvent } from "../src/lib/services/events.service";
import {
  attachStripeSessionToOrder,
  createPendingOrder,
  resolveCheckout,
} from "../src/lib/services/orders.service";
import {
  calculateArtistTicketRevenueSplit,
  isPaidArtistTicketCheckout,
} from "../src/lib/monetization/ticket-revenue-split";
import {
  deriveArtistConnectStatus,
  isArtistPayoutReady,
  mapStripeAccountToConnectFields,
} from "../src/lib/stripe/connect-status";
import type { CheckoutBody } from "../src/lib/validations/checkout";

const PLATFORM_ACCOUNT = "acct_1TyiEHEJwfqaexCo";
const CONNECTED_ACCOUNT = "acct_1U3xwlEJwfCXyXc7";
const ARTIST_NAME = "LiveCircuit Sandbox Test Artist";
const EVENT_TITLE = "LiveCircuit Sandbox Test Event";
const TICKET_PRICE_CENTS = 2000;
const EXISTING_ADMIN_USER_ID = "468563fc-5dd6-4728-b55b-0fa78c67136c";

type Report = Record<string, unknown>;

function loadStripeSecretKey(): string {
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
    return process.env.STRIPE_SECRET_KEY;
  }
  const toml = readFileSync(join(homedir(), ".config", "stripe", "config.toml"), "utf8");
  const match = toml.match(/test_mode_api_key\s*=\s*['"]([^'"]+)['"]/);
  if (!match?.[1]?.startsWith("sk_test_")) {
    throw new Error("Stripe TEST secret key not found. Set STRIPE_SECRET_KEY=sk_test_...");
  }
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
  const parsed = JSON.parse(raw) as {
    keys: Array<{ name: string; api_key: string }>;
  };
  const service = parsed.keys.find((k) => k.name === "service_role");
  if (!service?.api_key) throw new Error("Could not load Supabase service_role key");
  return { url, serviceRoleKey: service.api_key };
}

async function persistArtistConnectFields(
  admin: SupabaseClient,
  artistId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin
    .from("artists")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", artistId);
  if (error) throw new Error(error.message);
}

async function syncArtistConnectFromStripeAccount(
  admin: SupabaseClient,
  stripe: Stripe,
  artistId: string,
  account: Stripe.Account,
): Promise<void> {
  if (account.id && account.payouts_enabled) {
    if (account.settings?.payouts?.schedule?.interval !== "manual") {
      await stripe.accounts.update(account.id, {
        settings: { payouts: { schedule: { interval: "manual" } } },
      });
      account = await stripe.accounts.retrieve(account.id);
    }
  }
  const mapped = mapStripeAccountToConnectFields(account);
  await persistArtistConnectFields(admin, artistId, {
    stripe_account_id: account.id,
    ...mapped,
  });
}

async function findExistingSandboxArtist(admin: SupabaseClient) {
  const { data } = await admin
    .from("artists")
    .select("id, user_id, stage_name, slug, stripe_account_id")
    .eq("stripe_account_id", CONNECTED_ACCOUNT)
    .maybeSingle();
  return data;
}

async function findExistingSandboxEvent(admin: SupabaseClient, artistId: string) {
  const { data: tours } = await admin
    .from("tours")
    .select("id, tour_stops(id, ticket_price_cents, events(id, slug, title))")
    .eq("artist_id", artistId)
    .eq("title", EVENT_TITLE)
    .limit(1);
  const tour = tours?.[0] as
    | {
        id: string;
        tour_stops?: Array<{
          id: string;
          ticket_price_cents: number;
          events?: Array<{ id: string; slug: string; title: string }> | { id: string; slug: string; title: string };
        }>;
      }
    | undefined;
  const stop = tour?.tour_stops?.[0];
  const eventRaw = stop?.events;
  const event = Array.isArray(eventRaw) ? eventRaw[0] : eventRaw;
  if (!tour?.id || !stop?.id || !event?.id) return null;
  return {
    tourId: tour.id,
    stopId: stop.id,
    eventId: event.id,
    eventSlug: event.slug,
    attachedToDraft: false,
  };
}

async function createNewSandboxArtist(admin: SupabaseClient): Promise<{
  userId: string;
  artistId: string;
  email: string;
  password: string;
}> {
  const seed = Date.now() % 100000;
  const email = `sandbox-e2e-artist-${seed}@test.watchlivecircuit.com`;
  const password = `Test!${seed}Lc`;
  const username = `sandboxartist${seed}`;

  const { data: auth, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: ARTIST_NAME,
      username,
      intended_role: "artist",
      is_test_account: true,
    },
  });
  if (authError || !auth.user) throw new Error(authError?.message ?? "Failed to create auth user");

  const userId = auth.user.id;

  await admin
    .from("profiles")
    .update({
      display_name: ARTIST_NAME,
      username,
      role: "artist",
      is_test_account: true,
      test_scenario: "brand_new_artist",
      test_created_by: EXISTING_ADMIN_USER_ID,
      test_created_at: new Date().toISOString(),
      onboarding_completed: true,
    })
    .eq("id", userId);

  let { data: artist } = await admin.from("artists").select("id").eq("user_id", userId).maybeSingle();
  if (!artist?.id) {
    const { error: rpcError } = await admin.rpc("create_artist_for_user", {
      p_user_id: userId,
      p_stage_name: ARTIST_NAME,
      p_username: username,
    });
    if (rpcError) throw new Error(rpcError.message);
    ({ data: artist } = await admin.from("artists").select("id").eq("user_id", userId).maybeSingle());
  }
  if (!artist?.id) throw new Error("Artist row missing after create_artist_for_user");

  await admin
    .from("artists")
    .update({ stage_name: ARTIST_NAME, category: "music", short_bio: "Stripe Sandbox E2E test artist." })
    .eq("id", artist.id);

  return { userId, artistId: artist.id, email, password };
}

async function createSandboxFan(admin: SupabaseClient): Promise<{
  userId: string;
  email: string;
  password: string;
}> {
  const seed = (Date.now() + 1) % 100000;
  const email = `sandbox-e2e-fan-${seed}@test.watchlivecircuit.com`;
  const password = `Test!${seed}Lc`;
  const username = `sandboxfan${seed}`;

  const { data: auth, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: "LiveCircuit Sandbox Test Fan",
      username,
      intended_role: "fan",
      is_test_account: true,
    },
  });
  if (authError || !auth.user) throw new Error(authError?.message ?? "Failed to create fan user");

  await admin
    .from("profiles")
    .update({
      display_name: "LiveCircuit Sandbox Test Fan",
      username,
      role: "fan",
      is_test_account: true,
      test_scenario: "brand_new_fan",
      test_created_by: EXISTING_ADMIN_USER_ID,
      test_created_at: new Date().toISOString(),
      onboarding_completed: true,
    })
    .eq("id", auth.user.id);

  return { userId: auth.user.id, email, password };
}

async function linkExistingConnectAccount(
  admin: SupabaseClient,
  stripe: Stripe,
  artistId: string,
): Promise<Stripe.Account> {
  let account = await stripe.accounts.retrieve(CONNECTED_ACCOUNT);
  if (account.metadata?.livecircuit_artist_id !== artistId) {
    account = await stripe.accounts.update(CONNECTED_ACCOUNT, {
      metadata: { livecircuit_artist_id: artistId },
    });
  }
  await syncArtistConnectFromStripeAccount(admin, stripe, artistId, account);
  return stripe.accounts.retrieve(CONNECTED_ACCOUNT);
}

async function waitForWebhook(
  admin: SupabaseClient,
  eventId: string,
  timeoutMs = 60_000,
): Promise<{ found: boolean; row?: Record<string, unknown> }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await admin
      .from("monetization_stripe_webhook_events")
      .select("stripe_event_id, event_type, status, processed_at")
      .eq("stripe_event_id", eventId)
      .maybeSingle();
    if (data) return { found: true, row: data as Record<string, unknown> };
    await new Promise((r) => setTimeout(r, 3000));
  }
  return { found: false };
}

async function completeHostedCheckout(stripe: Stripe, sessionId: string): Promise<void> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const checkoutUrl = session.url;
  if (!checkoutUrl) throw new Error("Checkout session URL missing");

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
          return;
        }
      }
    }
    throw new Error(`Could not locate input for value starting with ${value.slice(0, 4)}`);
  };

  await fillFirstMatch(
    ['input[name="number"]', '[placeholder*="1234"]', '[autocomplete="cc-number"]', '#cardNumber'],
    "4242424242424242",
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
    const postal = frame.locator('[name="postalCode"], [placeholder*="ZIP"], [autocomplete="postal-code"]').first();
    if ((await postal.count()) > 0) {
      await postal.fill("12345");
      break;
    }
  }

  await page.getByTestId("hosted-payment-submit-button").click({ timeout: 30_000 });
  await page.waitForURL(/success=1|watchlivecircuit\.com/, { timeout: 120_000 });
  await browser.close();
}

async function findPendingSandboxOrder(admin: SupabaseClient) {
  const { data } = await admin
    .from("orders")
    .select("id, stripe_checkout_session_id, status")
    .eq("status", "pending")
    .not("stripe_checkout_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function main() {
  const report: Report = { steps: [] as string[], errors: [] as string[] };
  const log = (msg: string) => {
    (report.steps as string[]).push(msg);
    console.log(msg);
  };

  const stripeKey = loadStripeSecretKey();
  if (stripeKey.startsWith("sk_live_")) {
    throw new Error("Refusing to run: live Stripe key detected");
  }

  const { url, serviceRoleKey } = loadSupabaseCredentials();
  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
  process.env.STRIPE_SECRET_KEY = stripeKey;
  process.env.NEXT_PUBLIC_APP_URL =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.watchlivecircuit.com";

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  log("STEP 1: Routes — /register?role=artist, /api/stripe/connect/onboard, /artist/events/new, POST /api/stripe/checkout");

  log("STEP 2: Creating sandbox test artist via Testing Center pattern (auth.admin.createUser + create_artist_for_user RPC)");
  const existingArtist = await findExistingSandboxArtist(admin);
  const artist = existingArtist
    ? {
        userId: existingArtist.user_id as string,
        artistId: existingArtist.id as string,
        email: "(existing sandbox artist)",
        password: "",
        reused: true,
      }
    : { ...(await createNewSandboxArtist(admin)), reused: false };
  report.testArtist = { userId: artist.userId, artistId: artist.artistId, email: artist.email, reused: artist.reused };

  if (!artist.reused) {
    log("STEP 2b: Linking existing Connect account via Stripe sync (retrieve + manual payouts + persistArtistConnectFields pattern)");
    await linkExistingConnectAccount(admin, stripe, artist.artistId);
  } else {
    log("STEP 2b: Reusing artist already linked to Connect account");
    await syncArtistConnectFromStripeAccount(
      admin,
      stripe,
      artist.artistId,
      await stripe.accounts.retrieve(CONNECTED_ACCOUNT),
    );
  }
  const connectedAccount = await stripe.accounts.retrieve(CONNECTED_ACCOUNT);

  const { data: artistRow } = await admin
    .from("artists")
    .select(
      "stripe_account_id, stripe_onboarding_complete, stripe_payouts_manual, stripe_payouts_schedule, stripe_charges_enabled, stripe_payouts_enabled",
    )
    .eq("id", artist.artistId)
    .single();

  report.connect = {
    stripeAccountId: artistRow?.stripe_account_id,
    payoutsManual: artistRow?.stripe_payouts_manual,
    payoutSchedule: artistRow?.stripe_payouts_schedule,
    stripeSchedule: connectedAccount.settings?.payouts?.schedule?.interval,
    status: deriveArtistConnectStatus({
      stripe_account_id: artistRow?.stripe_account_id ?? null,
      stripe_onboarding_complete: Boolean(artistRow?.stripe_onboarding_complete),
      stripe_charges_enabled: Boolean(artistRow?.stripe_charges_enabled),
      stripe_payouts_enabled: Boolean(artistRow?.stripe_payouts_enabled),
      stripe_payouts_manual: Boolean(artistRow?.stripe_payouts_manual),
      stripe_payouts_schedule: artistRow?.stripe_payouts_schedule ?? null,
      stripe_details_submitted: true,
      stripe_requirements_due: [],
      stripe_connect_updated_at: new Date().toISOString(),
    }),
  };

  if (artistRow?.stripe_account_id !== CONNECTED_ACCOUNT) {
    throw new Error(`Expected stripe_account_id ${CONNECTED_ACCOUNT}, got ${artistRow?.stripe_account_id}`);
  }
  if (!artistRow?.stripe_payouts_manual || connectedAccount.settings?.payouts?.schedule?.interval !== "manual") {
    throw new Error("Connected account is not on manual payout schedule after sync");
  }

  log("STEP 3: Triggering account.updated for Connect webhook verification");
  await stripe.accounts.update(CONNECTED_ACCOUNT, {
    business_profile: { product_description: "LiveCircuit Sandbox E2E test account" },
  });
  const connectEvents = await stripe.events.list(
    { type: "account.updated", limit: 3 },
    { stripeAccount: CONNECTED_ACCOUNT },
  );
  const latestConnectEvent = connectEvents.data[0];
  report.connectWebhook = {
    latestEventId: latestConnectEvent?.id,
    latestEventType: latestConnectEvent?.type,
    note: "Check Stripe Dashboard Event Deliveries for HTTP 200 on Connected Accounts webhook",
  };
  if (latestConnectEvent?.id) {
    const webhookWait = await waitForWebhook(admin, latestConnectEvent.id, 45_000);
    report.connectWebhook.processedInDb = webhookWait.found;
    report.connectWebhook.dbRow = webhookWait.row;
  }

  log("STEP 4: Creating paid test event ($20) via createStandaloneEvent service");
  const existingEvent = await findExistingSandboxEvent(admin, artist.artistId);
  const event =
    existingEvent ??
    (await createStandaloneEvent(admin, artist.artistId, {
      title: EVENT_TITLE,
      virtualLocationLabel: "Sandbox Virtual Venue",
      tourCity: "Schenectady",
      tourStateCode: "NY",
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ticketPriceCents: TICKET_PRICE_CENTS,
      description: "Controlled Stripe Sandbox E2E test event.",
      timezone: "America/New_York",
      audienceMode: "worldwide",
    }));
  report.testEvent = { ...event, reused: Boolean(existingEvent) };

  log("STEP 5: Verifying checkout configuration (90/10 split, destination charge params)");
  const split = calculateArtistTicketRevenueSplit({ ticketSubtotalCents: TICKET_PRICE_CENTS });
  report.checkoutConfig = {
    grossCents: split.grossCents,
    platformFeeCents: split.platformFeeCents,
    artistEarningsCents: split.artistEarningsCents,
    destination: CONNECTED_ACCOUNT,
  };
  if (split.platformFeeCents !== 200 || split.artistEarningsCents !== 1800) {
    throw new Error(`Unexpected split: platform=${split.platformFeeCents} artist=${split.artistEarningsCents}`);
  }

  async function requireArtistConnectReady(artistId: string): Promise<string> {
    const { data: row } = await admin
      .from("artists")
      .select(
        "stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled, stripe_payouts_manual, stripe_payouts_schedule, stripe_details_submitted, stripe_requirements_due, stripe_connect_updated_at",
      )
      .eq("id", artistId)
      .single();
    const record = {
      stripe_account_id: (row?.stripe_account_id as string | null) ?? null,
      stripe_onboarding_complete: Boolean(row?.stripe_onboarding_complete),
      stripe_charges_enabled: Boolean(row?.stripe_charges_enabled),
      stripe_payouts_enabled: Boolean(row?.stripe_payouts_enabled),
      stripe_payouts_manual: Boolean(row?.stripe_payouts_manual),
      stripe_payouts_schedule: (row?.stripe_payouts_schedule as string | null) ?? null,
      stripe_details_submitted: Boolean(row?.stripe_details_submitted),
      stripe_requirements_due: Array.isArray(row?.stripe_requirements_due)
        ? (row?.stripe_requirements_due as string[])
        : [],
      stripe_connect_updated_at: (row?.stripe_connect_updated_at as string | null) ?? null,
    };
    const status = deriveArtistConnectStatus(record);
    if (status !== "ready" || !record.stripe_account_id) {
      throw new Error(`Artist Connect not ready (status=${status})`);
    }
    if (!isArtistPayoutReady(status, record)) {
      throw new Error("Artist Connect ready but manual payouts not configured for payout execution");
    }
    return record.stripe_account_id;
  }

  await requireArtistConnectReady(artist.artistId);

  log("STEP 6: Creating sandbox fan + checkout session via orders/checkout services");
  const pending = await findPendingSandboxOrder(admin);
  let orderId: string;
  let sessionId: string;
  let sessionUrl: string;

  if (pending?.stripe_checkout_session_id) {
    orderId = pending.id as string;
    sessionId = pending.stripe_checkout_session_id as string;
    const existingSession = await stripe.checkout.sessions.retrieve(sessionId);
    sessionUrl = existingSession.url ?? "";
    report.checkout = { orderId, checkoutSessionId: sessionId, url: sessionUrl, reused: true };
    log("STEP 6a: Reusing pending sandbox checkout session");
  } else {
    const fan = await createSandboxFan(admin);
    report.testFan = { userId: fan.userId, email: fan.email };

    const checkoutBody: CheckoutBody = {
      type: "ticket",
      tourStopId: event.stopId,
      tier: "general",
      quantity: 1,
    };

    const resolved = await resolveCheckout(admin, checkoutBody, fan.userId);
    const paidArtistTicket = isPaidArtistTicketCheckout({
      orderType: checkoutBody.type,
      unitAmountCents: resolved.pricing.unitAmountCents,
      artistId: resolved.artistId,
    });
    if (!paidArtistTicket) throw new Error("Expected paid artist ticket checkout");

    const checkoutTotals = {
      subtotalCents: TICKET_PRICE_CENTS,
      platformFeeCents: split.platformFeeCents,
      discountCents: 0,
      totalCents: TICKET_PRICE_CENTS,
      couponId: null as string | null,
      couponCode: null as string | null,
      ticketRevenueSplit: true,
      grossCents: split.grossCents,
      artistEarningsCents: split.artistEarningsCents,
    };

    orderId = await createPendingOrder(admin, {
      userId: fan.userId,
      resolved,
      body: checkoutBody,
      checkoutTotals,
    });

    const stripeAccountId = await requireArtistConnectReady(artist.artistId);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: fan.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: checkoutTotals.totalCents,
            product_data: { name: resolved.pricing.description },
          },
        },
      ],
      metadata: {
        order_id: orderId,
        user_id: fan.userId,
        type: checkoutBody.type,
        tour_stop_id: event.stopId,
        platform_fee_cents: String(checkoutTotals.platformFeeCents),
        gross_cents: String(checkoutTotals.grossCents),
        artist_earnings_cents: String(checkoutTotals.artistEarningsCents),
        ticket_revenue_split: "true",
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?canceled=1`,
      payment_intent_data: {
        application_fee_amount: checkoutTotals.platformFeeCents,
        transfer_data: { destination: stripeAccountId },
        metadata: { order_id: orderId, artist_id: artist.artistId },
      },
      managed_payments: { enabled: false },
    });

    await attachStripeSessionToOrder(admin, orderId, session.id);
    sessionId = session.id;
    sessionUrl = session.url ?? "";
    report.checkout = { orderId, checkoutSessionId: sessionId, url: sessionUrl, reused: false };
  }

  log("STEP 6b: Completing TEST checkout on Stripe hosted page (4242 card via Playwright)");
  await completeHostedCheckout(stripe, sessionId);

  log("STEP 7-9: Waiting for webhooks + order fulfillment (up to 90s)");
  let paidOrder: Record<string, unknown> | null = null;
  for (let i = 0; i < 30; i++) {
    const { data } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (data?.status === "paid") {
      paidOrder = data as Record<string, unknown>;
      break;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (!paidOrder) throw new Error("Order did not reach paid status after checkout");

  const paymentIntent = await stripe.paymentIntents.retrieve(String(paidOrder.stripe_payment_intent_id), {
    expand: ["latest_charge.balance_transaction", "latest_charge.application_fee", "latest_charge.transfer"],
  });
  const charge = paymentIntent.latest_charge as Stripe.Charge;
  const bt = charge.balance_transaction as Stripe.BalanceTransaction;
  const appFee = charge.application_fee as Stripe.ApplicationFee | null;
  const transfer = charge.transfer as string | Stripe.Transfer | null;

  report.stripeObjects = {
    orderId,
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntent.id,
    chargeId: charge.id,
    balanceTransactionId: bt?.id,
    applicationFeeId: appFee?.id ?? charge.application_fee,
    transferId: typeof transfer === "string" ? transfer : transfer?.id,
    connectedAccountId: CONNECTED_ACCOUNT,
    livemode: paymentIntent.livemode,
    applicationFeeAmount: paymentIntent.application_fee_amount,
    destination: charge.transfer_data?.destination ?? paymentIntent.transfer_data?.destination,
    stripeFeeCents: bt?.fee,
  };

  report.orderAccounting = {
    status: paidOrder.status,
    gross_cents: paidOrder.gross_cents,
    platform_fee_cents: paidOrder.platform_fee_cents,
    artist_earnings_cents: paidOrder.artist_earnings_cents,
    stripe_fee_cents: paidOrder.stripe_fee_cents,
    stripe_balance_transaction_id: paidOrder.stripe_balance_transaction_id,
    stripe_application_fee_id: paidOrder.stripe_application_fee_id,
    stripe_transfer_id: paidOrder.stripe_transfer_id,
    payment_success_at: paidOrder.payment_success_at,
    available_at: paidOrder.available_at,
    remaining_artist_earnings_cents: paidOrder.remaining_artist_earnings_cents,
    artist_payout_status: paidOrder.artist_payout_status,
  };

  const { data: balance } = await admin
    .from("artist_balances")
    .select("pending_cents, available_cents")
    .eq("artist_id", artist.artistId)
    .maybeSingle();
  report.artistBalance = balance;

  const { data: webhooks } = await admin
    .from("monetization_stripe_webhook_events")
    .select("stripe_event_id, event_type, status, processed_at")
    .order("processed_at", { ascending: false })
    .limit(10);
  report.recentWebhooks = webhooks;

  console.log("\n=== FIXTURE REPORT (JSON) ===");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
