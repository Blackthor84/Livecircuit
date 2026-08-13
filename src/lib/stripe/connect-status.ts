import type Stripe from "stripe";

export type ArtistConnectStatus =
  | "not_connected"
  | "onboarding_incomplete"
  | "verification_pending"
  | "ready"
  | "restricted";

export type ArtistConnectRecord = {
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_payouts_manual: boolean;
  stripe_payouts_schedule: string | null;
  stripe_details_submitted: boolean;
  stripe_requirements_due: string[];
  stripe_connect_updated_at: string | null;
};

export function normalizeRequirementsDue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Derive UI/admin status from persisted Connect metadata (never trust the browser). */
export function deriveArtistConnectStatus(record: ArtistConnectRecord): ArtistConnectStatus {
  if (!record.stripe_account_id) return "not_connected";

  const requirementsDue = normalizeRequirementsDue(record.stripe_requirements_due);
  const hasBlockingRequirements = requirementsDue.length > 0;

  if (
    record.stripe_charges_enabled &&
    record.stripe_payouts_enabled &&
    !hasBlockingRequirements
  ) {
    return "ready";
  }

  if (hasBlockingRequirements && record.stripe_details_submitted) {
    return "restricted";
  }

  if (record.stripe_details_submitted) {
    return "verification_pending";
  }

  return "onboarding_incomplete";
}

export function mapStripeAccountToConnectFields(
  account: Stripe.Account,
): Pick<
  ArtistConnectRecord,
  | "stripe_charges_enabled"
  | "stripe_payouts_enabled"
  | "stripe_payouts_manual"
  | "stripe_payouts_schedule"
  | "stripe_details_submitted"
  | "stripe_requirements_due"
  | "stripe_onboarding_complete"
  | "stripe_connect_updated_at"
> {
  const requirementsDue = normalizeRequirementsDue(account.requirements?.currently_due);
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const detailsSubmitted = Boolean(account.details_submitted);
  const payoutInterval = account.settings?.payouts?.schedule?.interval ?? null;
  const payoutsManual = payoutInterval === "manual";
  const ready =
    chargesEnabled &&
    payoutsEnabled &&
    requirementsDue.length === 0 &&
    !account.requirements?.disabled_reason;

  return {
    stripe_charges_enabled: chargesEnabled,
    stripe_payouts_enabled: payoutsEnabled,
    stripe_payouts_manual: payoutsManual,
    stripe_payouts_schedule: payoutInterval,
    stripe_details_submitted: detailsSubmitted,
    stripe_requirements_due: requirementsDue,
    stripe_onboarding_complete: ready,
    stripe_connect_updated_at: new Date().toISOString(),
  };
}

/** Payout execution requires Connect ready + manual payout schedule. */
export function isArtistPayoutReady(
  status: ArtistConnectStatus,
  record: ArtistConnectRecord,
): boolean {
  return (
    status === "ready" &&
    Boolean(record.stripe_account_id) &&
    record.stripe_payouts_manual &&
    record.stripe_charges_enabled &&
    record.stripe_payouts_enabled
  );
}

export function artistConnectStatusLabel(status: ArtistConnectStatus): string {
  switch (status) {
    case "not_connected":
      return "Not connected";
    case "onboarding_incomplete":
      return "Onboarding incomplete";
    case "verification_pending":
      return "Verification pending";
    case "ready":
      return "Ready";
    case "restricted":
      return "Restricted";
  }
}
