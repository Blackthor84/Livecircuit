import type { VenueSponsorshipStatus } from "@/types/database";

export type VenueNamingFields = {
  default_name: string;
  display_name: string;
  sponsored_name?: string | null;
  sponsor_company?: string | null;
  sponsor_logo_url?: string | null;
  sponsor_start_date?: string | null;
  sponsor_end_date?: string | null;
  sponsorship_status?: VenueSponsorshipStatus;
  naming_rights_price?: number | null;
  is_placeholder_name?: boolean;
  /** Legacy column kept in sync with display_name */
  name?: string;
};

/** Public-facing venue title. Slug is never derived from this. */
export function getVenueDisplayName(venue: VenueNamingFields): string {
  const sponsored = venue.sponsored_name?.trim();
  if (sponsored) return sponsored;
  return venue.default_name?.trim() || venue.display_name?.trim() || venue.name?.trim() || "Venue";
}

export function hasActiveVenueSponsorship(venue: VenueNamingFields): boolean {
  const sponsored = venue.sponsored_name?.trim();
  if (!sponsored) return false;
  if (venue.sponsorship_status === "expired") return false;
  if (venue.sponsor_end_date) {
    const end = new Date(venue.sponsor_end_date);
    if (!Number.isNaN(end.getTime()) && end < new Date()) return false;
  }
  return venue.sponsorship_status === "active" || venue.sponsorship_status === "pending";
}

export function isNamingRightsAvailable(venue: VenueNamingFields): boolean {
  return !hasActiveVenueSponsorship(venue);
}

export function sponsorshipStatusLabel(status: VenueSponsorshipStatus | undefined): string {
  switch (status) {
    case "active":
      return "Sponsored";
    case "pending":
      return "Pending";
    case "expired":
      return "Expired";
    default:
      return "Naming Rights Available";
  }
}
