import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getAppUrl } from "@/lib/config/env";
import { getStripe } from "@/lib/stripe/server";
import {
  deriveArtistConnectStatus,
  mapStripeAccountToConnectFields,
  normalizeRequirementsDue,
  type ArtistConnectRecord,
  type ArtistConnectStatus,
} from "@/lib/stripe/connect-status";

const ARTIST_CONNECT_SELECT =
  "stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled, stripe_payouts_manual, stripe_payouts_schedule, stripe_details_submitted, stripe_requirements_due, stripe_connect_updated_at";

function connectUrls() {
  const origin = getAppUrl();
  return {
    returnUrl: `${origin}/artist/settings/payments/return`,
    refreshUrl: `${origin}/artist/settings/payments/refresh`,
  };
}

function rowToRecord(row: Record<string, unknown> | null): ArtistConnectRecord {
  return {
    stripe_account_id: (row?.stripe_account_id as string | null) ?? null,
    stripe_onboarding_complete: Boolean(row?.stripe_onboarding_complete),
    stripe_charges_enabled: Boolean(row?.stripe_charges_enabled),
    stripe_payouts_enabled: Boolean(row?.stripe_payouts_enabled),
    stripe_payouts_manual: Boolean(row?.stripe_payouts_manual),
    stripe_payouts_schedule: (row?.stripe_payouts_schedule as string | null) ?? null,
    stripe_details_submitted: Boolean(row?.stripe_details_submitted),
    stripe_requirements_due: normalizeRequirementsDue(row?.stripe_requirements_due),
    stripe_connect_updated_at: (row?.stripe_connect_updated_at as string | null) ?? null,
  };
}

export type { ArtistConnectRecord, ArtistConnectStatus };
export {
  deriveArtistConnectStatus,
  mapStripeAccountToConnectFields,
  isArtistPayoutReady,
  artistConnectStatusLabel,
} from "@/lib/stripe/connect-status";

/** Configure Express connected account for manual bank payouts (7-day hold). */
export async function configureArtistManualPayouts(stripeAccountId: string): Promise<void> {
  const stripe = getStripe();
  await stripe.accounts.update(stripeAccountId, {
    settings: {
      payouts: {
        schedule: {
          interval: "manual",
        },
      },
    },
  });
}

async function ensureArtistManualPayouts(stripeAccountId: string): Promise<void> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(stripeAccountId);
  if (account.settings?.payouts?.schedule?.interval !== "manual") {
    await configureArtistManualPayouts(stripeAccountId);
  }
}

/** Create a Stripe Connect Express account for the authenticated artist. */
export async function createArtistConnectAccount(input: {
  artistId: string;
  email: string;
  displayName: string;
  country?: string;
}): Promise<{ accountId: string; account: Stripe.Account }> {
  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: "express",
    country: input.country ?? "US",
    email: input.email || undefined,
    business_type: "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      livecircuit_artist_id: input.artistId,
    },
    business_profile: {
      name: input.displayName,
    },
  });

  if (!account.id) {
    throw new Error("Stripe did not return a connected account id");
  }

  try {
    await ensureArtistManualPayouts(account.id);
  } catch (error) {
    console.warn("[connect] manual payout configuration deferred", account.id, error);
  }

  return { accountId: account.id, account };
}

/** Retrieve the Stripe Connect account from Stripe (source of truth). */
export async function getArtistConnectAccount(stripeAccountId: string): Promise<Stripe.Account> {
  const stripe = getStripe();
  return stripe.accounts.retrieve(stripeAccountId);
}

/** Generate a Stripe-hosted onboarding Account Link. */
export async function createArtistConnectOnboardingLink(
  stripeAccountId: string,
): Promise<{ url: string }> {
  const stripe = getStripe();
  const { returnUrl, refreshUrl } = connectUrls();
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  if (!link.url) {
    throw new Error("Stripe did not return an onboarding URL");
  }

  return { url: link.url };
}

/** Stripe Express Dashboard login link for connected artists. */
export async function createArtistConnectLoginLink(
  stripeAccountId: string,
): Promise<{ url: string }> {
  const stripe = getStripe();
  const link = await stripe.accounts.createLoginLink(stripeAccountId);
  if (!link.url) {
    throw new Error("Stripe did not return a dashboard URL");
  }
  return { url: link.url };
}

export async function getArtistConnectStatus(
  supabase: SupabaseClient,
  artistId: string,
): Promise<{ status: ArtistConnectStatus; record: ArtistConnectRecord }> {
  const { data } = await supabase
    .from("artists")
    .select(ARTIST_CONNECT_SELECT)
    .eq("id", artistId)
    .maybeSingle();

  const record = rowToRecord(data as Record<string, unknown> | null);
  return { status: deriveArtistConnectStatus(record), record };
}

export async function persistArtistConnectFields(
  supabase: SupabaseClient,
  artistId: string,
  fields: Partial<ArtistConnectRecord> & { stripe_account_id?: string | null },
): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ("stripe_account_id" in fields) payload.stripe_account_id = fields.stripe_account_id;
  if ("stripe_onboarding_complete" in fields) {
    payload.stripe_onboarding_complete = fields.stripe_onboarding_complete;
  }
  if ("stripe_charges_enabled" in fields) payload.stripe_charges_enabled = fields.stripe_charges_enabled;
  if ("stripe_payouts_enabled" in fields) payload.stripe_payouts_enabled = fields.stripe_payouts_enabled;
  if ("stripe_payouts_manual" in fields) payload.stripe_payouts_manual = fields.stripe_payouts_manual;
  if ("stripe_payouts_schedule" in fields) payload.stripe_payouts_schedule = fields.stripe_payouts_schedule;
  if ("stripe_details_submitted" in fields) {
    payload.stripe_details_submitted = fields.stripe_details_submitted;
  }
  if ("stripe_requirements_due" in fields) {
    payload.stripe_requirements_due = fields.stripe_requirements_due;
  }
  if ("stripe_connect_updated_at" in fields) {
    payload.stripe_connect_updated_at = fields.stripe_connect_updated_at;
  }

  const { error } = await supabase.from("artists").update(payload).eq("id", artistId);
  if (error) throw new Error(error.message);
}

export async function syncArtistConnectFromStripeAccount(
  supabase: SupabaseClient,
  artistId: string,
  account: Stripe.Account,
): Promise<ArtistConnectStatus> {
  if (account.id && account.payouts_enabled) {
    try {
      await ensureArtistManualPayouts(account.id);
      account = await getArtistConnectAccount(account.id);
    } catch (error) {
      console.warn("[connect] manual payout sync failed", account.id, error);
    }
  }

  const mapped = mapStripeAccountToConnectFields(account);
  await persistArtistConnectFields(supabase, artistId, mapped);
  return deriveArtistConnectStatus({
    stripe_account_id: account.id,
    ...mapped,
  });
}

export async function findArtistIdByStripeAccountId(
  supabase: SupabaseClient,
  stripeAccountId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("artists")
    .select("id")
    .eq("stripe_account_id", stripeAccountId)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

export async function resolveArtistIdForStripeAccount(
  supabase: SupabaseClient,
  account: Stripe.Account,
): Promise<string | null> {
  const fromMetadata = account.metadata?.livecircuit_artist_id;
  if (fromMetadata) return fromMetadata;

  if (account.id) {
    return findArtistIdByStripeAccountId(supabase, account.id);
  }

  return null;
}

/**
 * Ensure the artist has a Connect account and return an onboarding or dashboard URL.
 * Does not create duplicate Stripe accounts.
 */
export async function beginArtistConnectOnboarding(input: {
  supabase: SupabaseClient;
  artistId: string;
  email: string;
  displayName: string;
  mode: "onboarding" | "manage";
}): Promise<{ url: string; status: ArtistConnectStatus }> {
  const { record, status } = await getArtistConnectStatus(input.supabase, input.artistId);

  let stripeAccountId = record.stripe_account_id;
  let account: Stripe.Account | null = null;

  if (!stripeAccountId) {
    const created = await createArtistConnectAccount({
      artistId: input.artistId,
      email: input.email,
      displayName: input.displayName,
    });
    stripeAccountId = created.accountId;
    account = created.account;
    await persistArtistConnectFields(input.supabase, input.artistId, {
      stripe_account_id: stripeAccountId,
      ...mapStripeAccountToConnectFields(account),
    });
  } else if (input.mode === "manage" && status === "ready") {
    const login = await createArtistConnectLoginLink(stripeAccountId);
    return { url: login.url, status };
  } else {
    account = await getArtistConnectAccount(stripeAccountId);
    await syncArtistConnectFromStripeAccount(input.supabase, input.artistId, account);
  }

  const link = await createArtistConnectOnboardingLink(stripeAccountId);
  const refreshed = await getArtistConnectStatus(input.supabase, input.artistId);
  return { url: link.url, status: refreshed.status };
}

export async function refreshArtistConnectStatusFromStripe(
  supabase: SupabaseClient,
  artistId: string,
): Promise<ArtistConnectStatus> {
  const { record } = await getArtistConnectStatus(supabase, artistId);
  if (!record.stripe_account_id) return "not_connected";

  const account = await getArtistConnectAccount(record.stripe_account_id);
  return syncArtistConnectFromStripeAccount(supabase, artistId, account);
}
