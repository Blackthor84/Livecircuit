import type {
  SponsorshipContractStatus,
  SponsorshipPaymentFrequency,
  SponsorshipRenewalStatus,
} from "@/lib/sponsorship/constants";

export type SponsorshipBusinessContract = {
  id: string;
  slotTypeSlug: string;
  slotName: string;
  organizationId: string | null;
  organizationName: string | null;
  venueId: string | null;
  venueName: string | null;
  eventId: string | null;
  tourId: string | null;
  featuredStageId: string | null;
  displayLabel: string;
  logoUrl: string | null;
  sponsorWebsite: string | null;
  city: string | null;
  stateCode: string | null;
  contractValueCents: number;
  contractLengthMonths: number | null;
  customContractLength: boolean;
  paymentFrequency: SponsorshipPaymentFrequency | null;
  customPaymentPlan: string | null;
  contractStartsAt: string | null;
  contractEndsAt: string | null;
  autoRenew: boolean;
  renewalStatus: SponsorshipRenewalStatus;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  aiRecommendedPriceCents: number | null;
  aiPriceAccepted: boolean | null;
  status: SponsorshipContractStatus;
  renewalReminderAt: string | null;
  firstRightOfRenewalDays: number | null;
  renewalWindowStartsAt: string | null;
  renewalWindowEndsAt: string | null;
  previousContractId: string | null;
  renewedFromId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateContractInput = {
  slotTypeSlug: string;
  organizationId?: string | null;
  venueId?: string | null;
  eventId?: string | null;
  tourId?: string | null;
  featuredStageId?: string | null;
  displayLabel: string;
  logoUrl?: string | null;
  sponsorWebsite?: string | null;
  contractValueCents: number;
  contractLengthMonths?: number | null;
  customContractLength?: boolean;
  paymentFrequency?: SponsorshipPaymentFrequency;
  customPaymentPlan?: string | null;
  contractStartsAt?: string | null;
  contractEndsAt?: string | null;
  autoRenew?: boolean;
  renewalStatus?: SponsorshipRenewalStatus;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  aiRecommendedPriceCents?: number | null;
  aiPriceAccepted?: boolean | null;
  status?: SponsorshipContractStatus;
  previousContractId?: string | null;
  renewedFromId?: string | null;
  firstRightOfRenewalDays?: number | null;
};

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function mapBusinessContract(row: Record<string, unknown>): SponsorshipBusinessContract {
  const org = unwrapJoin(row.sponsor_organizations as { name: string } | { name: string }[] | null);
  const slot = unwrapJoin(row.sponsorship_slot_types as { name: string } | { name: string }[] | null);
  const venue = unwrapJoin(
    row.venues as { default_name: string } | { default_name: string }[] | null
  );

  return {
    id: row.id as string,
    slotTypeSlug: row.slot_type_slug as string,
    slotName: slot?.name ?? (row.slot_type_slug as string),
    organizationId: (row.organization_id as string) ?? null,
    organizationName: org?.name ?? null,
    venueId: (row.venue_id as string) ?? null,
    venueName: venue?.default_name ?? null,
    eventId: (row.event_id as string) ?? null,
    tourId: (row.tour_id as string) ?? null,
    featuredStageId: (row.featured_stage_id as string) ?? null,
    displayLabel: row.display_label as string,
    logoUrl: (row.logo_url as string) ?? null,
    sponsorWebsite: (row.sponsor_website as string) ?? null,
    city: (row.city as string) ?? null,
    stateCode: (row.state_code as string) ?? null,
    contractValueCents: (row.contract_value_cents as number) ?? 0,
    contractLengthMonths: (row.contract_length_months as number) ?? null,
    customContractLength: Boolean(row.custom_contract_length),
    paymentFrequency: (row.payment_frequency as SponsorshipPaymentFrequency) ?? null,
    customPaymentPlan: (row.custom_payment_plan as string) ?? null,
    contractStartsAt: (row.contract_starts_at as string) ?? null,
    contractEndsAt: (row.contract_ends_at as string) ?? null,
    autoRenew: Boolean(row.auto_renew),
    renewalStatus: (row.renewal_status as SponsorshipRenewalStatus) ?? "not_due",
    contactName: (row.contact_name as string) ?? null,
    contactEmail: (row.contact_email as string) ?? null,
    contactPhone: (row.contact_phone as string) ?? null,
    notes: (row.notes as string) ?? null,
    aiRecommendedPriceCents: (row.ai_recommended_price_cents as number) ?? null,
    aiPriceAccepted: row.ai_price_accepted == null ? null : Boolean(row.ai_price_accepted),
    status: row.status as SponsorshipContractStatus,
    renewalReminderAt: (row.renewal_reminder_at as string) ?? null,
    firstRightOfRenewalDays: (row.first_right_of_renewal_days as number) ?? null,
    renewalWindowStartsAt: (row.renewal_window_starts_at as string) ?? null,
    renewalWindowEndsAt: (row.renewal_window_ends_at as string) ?? null,
    previousContractId: (row.previous_contract_id as string) ?? null,
    renewedFromId: (row.renewed_from_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const CONTRACT_SELECT = `
  *,
  sponsor_organizations(name, logo_url, website_url),
  sponsorship_slot_types(name),
  venues(default_name, region, state_code, slug)
`;

export function toContractPayload(input: CreateContractInput, contractId?: string) {
  const base = {
    slot_type_slug: input.slotTypeSlug,
    organization_id: input.organizationId ?? null,
    venue_id: input.venueId ?? null,
    event_id: input.eventId ?? null,
    tour_id: input.tourId ?? null,
    featured_stage_id: input.featuredStageId ?? null,
    display_label: input.displayLabel.trim(),
    logo_url: input.logoUrl ?? null,
    sponsor_website: input.sponsorWebsite ?? null,
    contract_value_cents: input.contractValueCents,
    contract_length_months: input.contractLengthMonths ?? null,
    custom_contract_length: input.customContractLength ?? false,
    payment_frequency: input.paymentFrequency ?? "annual",
    custom_payment_plan: input.customPaymentPlan ?? null,
    contract_starts_at: input.contractStartsAt ?? null,
    contract_ends_at: input.contractEndsAt ?? null,
    auto_renew: input.autoRenew ?? false,
    renewal_status: input.renewalStatus ?? "not_due",
    contact_name: input.contactName ?? null,
    contact_email: input.contactEmail ?? null,
    contact_phone: input.contactPhone ?? null,
    notes: input.notes ?? null,
    ai_recommended_price_cents: input.aiRecommendedPriceCents ?? null,
    ai_price_accepted: input.aiPriceAccepted ?? null,
    status: input.status ?? "pending",
    previous_contract_id: input.previousContractId ?? null,
    renewed_from_id: input.renewedFromId ?? null,
    first_right_of_renewal_days: input.firstRightOfRenewalDays ?? null,
  };

  return contractId ? { ...base, updated_at: new Date().toISOString() } : base;
}
