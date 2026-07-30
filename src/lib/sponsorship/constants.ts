export type SponsorshipSlotScope = "venue" | "event" | "tour" | "platform" | "featured_stage";

export type SponsorshipContractStatus =
  | "available"
  | "pending"
  | "active"
  | "expired"
  | "cancelled"
  | "reserved";

export type SponsorshipPaymentFrequency =
  | "monthly"
  | "quarterly"
  | "bi_annual"
  | "annual"
  | "one_time"
  | "custom";

export type SponsorshipRenewalStatus =
  | "not_due"
  | "pending_renewal"
  | "renewed"
  | "declined"
  | "expired";

export type SponsorshipAuctionStatus = "draft" | "open" | "closed" | "awarded" | "cancelled";

export type SponsorshipBidStatus = "pending" | "accepted" | "rejected" | "countered" | "withdrawn";

export type SponsorshipExclusivityScope = "city" | "state" | "genre" | "category" | "platform";

export type SponsorshipInventoryStatus = "available" | "reserved" | "sold" | "expired" | "waiting_list";

/** Standard contract lengths in months */
export const CONTRACT_LENGTH_MONTHS = [1, 3, 6, 12, 24, 36, 60] as const;

export const CONTRACT_LENGTH_LABELS: Record<number, string> = {
  1: "1 Month",
  3: "3 Months",
  6: "6 Months",
  12: "12 Months",
  24: "24 Months",
  36: "36 Months",
  60: "60 Months",
};

export const PAYMENT_FREQUENCY_OPTIONS: {
  id: SponsorshipPaymentFrequency;
  label: string;
}[] = [
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "bi_annual", label: "Bi-Annual" },
  { id: "annual", label: "Annual" },
  { id: "one_time", label: "One-Time" },
  { id: "custom", label: "Custom Payment Plan" },
];

/** Admin renewal reminders when auto_renew is disabled */
export const RENEWAL_NOTIFICATION_DAYS = [180, 90, 60, 30, 14, 7, 1] as const;

export const RENEWAL_REMINDER_DAYS = 30;

/** Venue-scoped exclusive slots (max 1 each per venue) */
export const VENUE_PREMIUM_SLOTS = [
  "arena_naming_rights",
  "official_arena_partner",
  "vip_lounge",
  "artist_green_room",
  "fan_zone",
  "wifi",
] as const;

export const EVENT_PREMIUM_SLOTS = ["livestream", "event_sponsor", "replay"] as const;

export const TOUR_PREMIUM_SLOTS = ["tour_sponsor", "festival_sponsor"] as const;

export const PLATFORM_PREMIUM_SLOTS = [
  "platform_official_airline",
  "platform_official_audio",
  "platform_official_camera",
  "platform_official_streaming",
  "platform_official_beverage",
  "platform_official_vehicle",
  "platform_official_clothing",
] as const;

/** Slots we intentionally do NOT sell — documented for sales/product */
export const NON_INVENTORY_EXAMPLES = [
  "Every stage permanent naming",
  "Hallway sponsorships",
  "Bathroom sponsorships",
  "Seat sponsorships",
  "Menu sponsorships",
  "Chat message sponsorships",
  "Popup ads",
  "Constant banner flooding",
] as const;

export function computeContractEndDate(startDate: string, lengthMonths: number): string {
  const start = new Date(startDate);
  start.setMonth(start.getMonth() + lengthMonths);
  return start.toISOString().slice(0, 10);
}
