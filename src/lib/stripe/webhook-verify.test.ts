import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import {
  getConfiguredStripeWebhookSecrets,
  verifyStripeWebhookPayload,
} from "@/lib/stripe/webhook-verify";
import { processStripeWebhookEvent } from "@/lib/monetization/stripe-webhook.service";

const PLATFORM_SECRET = "whsec_platform_test_secret_value_1234567890";
const CONNECT_SECRET = "whsec_connect_test_secret_value_1234567890";
const WRONG_SECRET = "whsec_wrong_test_secret_value_1234567890";

function createTestStripe() {
  return new Stripe("sk_test_123456789012345678901234567890", {
    typescript: true,
  });
}

function buildEventPayload(overrides?: Partial<{ id: string; type: string; account: string | null }>) {
  return JSON.stringify({
    id: overrides?.id ?? "evt_test_webhook_dual_secret",
    object: "event",
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    type: overrides?.type ?? "charge.succeeded",
    account: overrides?.account ?? null,
    data: {
      object: {
        id: "ch_test_123",
        object: "charge",
        amount: 2000,
        payment_intent: "pi_test_123",
        metadata: { order_id: "order_test_123" },
      },
    },
  });
}

function signPayload(stripe: Stripe, payload: string, secret: string) {
  return stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
}

describe("stripe webhook dual-secret verification", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns configured secrets in deterministic platform-then-connect order", () => {
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = PLATFORM_SECRET;

    expect(getConfiguredStripeWebhookSecrets()).toEqual([
      { scope: "platform", secret: PLATFORM_SECRET },
      { scope: "connect", secret: CONNECT_SECRET },
    ]);
  });

  it("platform secret verifies platform-scoped event", () => {
    process.env.STRIPE_WEBHOOK_SECRET = PLATFORM_SECRET;
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT_SECRET;

    const stripe = createTestStripe();
    const payload = buildEventPayload({ account: null });
    const signature = signPayload(stripe, payload, PLATFORM_SECRET);

    const result = verifyStripeWebhookPayload(stripe, payload, signature);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.verifiedScope).toBe("platform");
      expect(result.event.id).toBe("evt_test_webhook_dual_secret");
    }
  });

  it("connected-account secret verifies connected-account event", () => {
    process.env.STRIPE_WEBHOOK_SECRET = PLATFORM_SECRET;
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT_SECRET;

    const stripe = createTestStripe();
    const payload = buildEventPayload({
      type: "payout.paid",
      account: "acct_connected_123",
    });
    const signature = signPayload(stripe, payload, CONNECT_SECRET);

    const result = verifyStripeWebhookPayload(stripe, payload, signature);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.verifiedScope).toBe("connect");
      expect(result.event.account).toBe("acct_connected_123");
    }
  });

  it("rejects webhook signed with wrong secret", () => {
    process.env.STRIPE_WEBHOOK_SECRET = PLATFORM_SECRET;
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT_SECRET;

    const stripe = createTestStripe();
    const payload = buildEventPayload();
    const signature = signPayload(stripe, payload, WRONG_SECRET);

    const result = verifyStripeWebhookPayload(stripe, payload, signature);
    expect(result).toEqual({ ok: false, reason: "invalid_signature" });
  });

  it("rejects when both webhook secrets are missing", () => {
    const stripe = createTestStripe();
    const payload = buildEventPayload();
    const signature = signPayload(stripe, payload, PLATFORM_SECRET);

    const result = verifyStripeWebhookPayload(stripe, payload, signature);
    expect(result).toEqual({ ok: false, reason: "missing_secrets" });
  });

  it("rejects invalid signature header", () => {
    process.env.STRIPE_WEBHOOK_SECRET = PLATFORM_SECRET;
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT_SECRET;

    const stripe = createTestStripe();
    const payload = buildEventPayload();

    const result = verifyStripeWebhookPayload(stripe, payload, "not-a-valid-stripe-signature");
    expect(result).toEqual({ ok: false, reason: "invalid_signature" });
  });

  it("rejects thin/v2 webhook payloads without trying the second secret", () => {
    process.env.STRIPE_WEBHOOK_SECRET = PLATFORM_SECRET;
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT_SECRET;

    const stripe = createTestStripe();
    const payload = JSON.stringify({
      id: "evt_v2_thin",
      object: "v2.core.event",
      type: "v2.core.account.updated",
      created: new Date().toISOString(),
    });
    const signature = signPayload(stripe, payload, PLATFORM_SECRET);

    const result = verifyStripeWebhookPayload(stripe, payload, signature);
    expect(result).toEqual({ ok: false, reason: "invalid_payload" });
  });

  it("does not expose webhook secrets in verification errors", () => {
    process.env.STRIPE_WEBHOOK_SECRET = PLATFORM_SECRET;
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT_SECRET;

    const stripe = createTestStripe();
    const payload = buildEventPayload();
    const signature = signPayload(stripe, payload, WRONG_SECRET);

    const result = verifyStripeWebhookPayload(stripe, payload, signature);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(PLATFORM_SECRET);
    expect(serialized).not.toContain(CONNECT_SECRET);
  });

  it("still accepts platform secret when connect secret is not configured", () => {
    process.env.STRIPE_WEBHOOK_SECRET = PLATFORM_SECRET;

    const stripe = createTestStripe();
    const payload = buildEventPayload();
    const signature = signPayload(stripe, payload, PLATFORM_SECRET);

    const result = verifyStripeWebhookPayload(stripe, payload, signature);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.verifiedScope).toBe("platform");
    }
  });
});

describe("stripe webhook route handler integration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.STRIPE_WEBHOOK_SECRET = PLATFORM_SECRET;
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT_SECRET;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("executes processStripeWebhookEvent after successful verification", async () => {
    const stripe = createTestStripe();
    const payload = buildEventPayload({ type: "account.updated", account: "acct_123" });
    const signature = signPayload(stripe, payload, CONNECT_SECRET);

    const processSpy = vi.fn().mockResolvedValue({ duplicate: false, handled: true });
    const supabase = {} as never;

    vi.doMock("@/lib/stripe/server", () => ({
      getStripe: () => stripe,
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      getSupabaseAdmin: () => supabase,
    }));
    vi.doMock("@/lib/monetization/stripe-webhook.service", () => ({
      processStripeWebhookEvent: processSpy,
    }));
    vi.doMock("next/headers", () => ({
      headers: async () => ({
        get: (name: string) => (name === "stripe-signature" ? signature : null),
      }),
    }));

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: payload,
      }),
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      received: boolean;
      verifiedScope: string;
      duplicate: boolean;
    };
    expect(json.received).toBe(true);
    expect(json.verifiedScope).toBe("connect");
    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy.mock.calls[0]?.[2]?.id).toBe("evt_test_webhook_dual_secret");
    expect(JSON.stringify(json)).not.toContain(PLATFORM_SECRET);
    expect(JSON.stringify(json)).not.toContain(CONNECT_SECRET);
  });

  it("preserves duplicate event idempotency in processStripeWebhookEvent", async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    const existingLookup = vi
      .fn()
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { id: "existing-row" } });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "monetization_stripe_webhook_events") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: existingLookup,
              }),
            }),
            insert: insertSpy,
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }),
      rpc: vi.fn(),
    };

    const stripe = createTestStripe();
    const event = JSON.parse(
      buildEventPayload({ type: "test.unhandled.event.for.idempotency" }),
    ) as Stripe.Event;

    const first = await processStripeWebhookEvent(supabase as never, stripe, event);
    const second = await processStripeWebhookEvent(supabase as never, stripe, event);

    expect(first).toEqual({ duplicate: false, handled: false });
    expect(second).toEqual({ duplicate: true, handled: true });
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });
});
