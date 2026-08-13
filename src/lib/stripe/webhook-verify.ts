import "server-only";

import Stripe from "stripe";

export type StripeWebhookSecretScope = "platform" | "connect";

export type StripeWebhookVerificationFailureReason =
  | "missing_secrets"
  | "invalid_signature"
  | "invalid_payload";

export type StripeWebhookVerificationResult =
  | { ok: true; event: Stripe.Event; verifiedScope: StripeWebhookSecretScope }
  | { ok: false; reason: StripeWebhookVerificationFailureReason };

type ConfiguredSecret = {
  scope: StripeWebhookSecretScope;
  secret: string;
};

/** Ordered deterministically: platform first, then connected-account secret. */
export function getConfiguredStripeWebhookSecrets(): ConfiguredSecret[] {
  const secrets: ConfiguredSecret[] = [];

  const platformSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (platformSecret) {
    secrets.push({ scope: "platform", secret: platformSecret });
  }

  const connectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim();
  if (connectSecret) {
    secrets.push({ scope: "connect", secret: connectSecret });
  }

  return secrets;
}

function isSignatureVerificationError(error: unknown): error is Stripe.errors.StripeSignatureVerificationError {
  return error instanceof Stripe.errors.StripeSignatureVerificationError;
}

/**
 * Verify a Stripe snapshot/v1 webhook using the installed SDK.
 * Tries STRIPE_WEBHOOK_SECRET first, then STRIPE_CONNECT_WEBHOOK_SECRET.
 */
export function verifyStripeWebhookPayload(
  stripe: Stripe,
  payload: string,
  signatureHeader: string,
): StripeWebhookVerificationResult {
  const secrets = getConfiguredStripeWebhookSecrets();
  if (secrets.length === 0) {
    return { ok: false, reason: "missing_secrets" };
  }

  let sawSignatureFailure = false;

  for (const { scope, secret } of secrets) {
    try {
      const event = stripe.webhooks.constructEvent(payload, signatureHeader, secret);
      return { ok: true, event, verifiedScope: scope };
    } catch (error) {
      if (isSignatureVerificationError(error)) {
        sawSignatureFailure = true;
        continue;
      }
      return { ok: false, reason: "invalid_payload" };
    }
  }

  if (sawSignatureFailure) {
    return { ok: false, reason: "invalid_signature" };
  }

  return { ok: false, reason: "invalid_signature" };
}
