import type { AgencyMemberRole, AgencyPlan } from "@/lib/agency/types";

export type AgencyScenarioSlug = "boutique_agency" | "mid_size_agency" | "enterprise_agency";

export type AgencyTeamSlot = {
  role: AgencyMemberRole;
  count: number;
};

export type AgencyOrgTemplate = {
  slug: AgencyScenarioSlug;
  label: string;
  description: string;
  plan: AgencyPlan;
  artistCount: number;
  bookingCount: number;
  /** Roles excluding owner — owner is always created separately. */
  team: AgencyTeamSlot[];
};

/** All agency member roles including owner (for reference lists). */
export const AGENCY_TEAM_ROLES: AgencyMemberRole[] = [
  "owner",
  "admin",
  "booking_manager",
  "artist_manager",
  "marketing",
  "finance",
  "assistant",
  "read_only",
];

export const AGENCY_ORG_TEMPLATES: AgencyOrgTemplate[] = [
  {
    slug: "boutique_agency",
    label: "Boutique Agency",
    description:
      "Starter plan — owner, 2 booking managers, artist manager, marketing, finance, assistant, 10 artists, 50 bookings.",
    plan: "starter",
    artistCount: 10,
    bookingCount: 50,
    team: [
      { role: "booking_manager", count: 2 },
      { role: "artist_manager", count: 1 },
      { role: "marketing", count: 1 },
      { role: "finance", count: 1 },
      { role: "assistant", count: 1 },
    ],
  },
  {
    slug: "mid_size_agency",
    label: "Mid-Size Agency",
    description:
      "Pro plan — admins, booking & artist managers, marketing & finance teams, 40 artists, 250 bookings.",
    plan: "pro",
    artistCount: 40,
    bookingCount: 250,
    team: [
      { role: "admin", count: 3 },
      { role: "booking_manager", count: 5 },
      { role: "artist_manager", count: 3 },
      { role: "marketing", count: 2 },
      { role: "finance", count: 2 },
      { role: "assistant", count: 2 },
    ],
  },
  {
    slug: "enterprise_agency",
    label: "Enterprise Agency",
    description:
      "Enterprise plan — executive, operations, talent, marketing, finance, support teams, 150 artists, 1000 bookings.",
    plan: "enterprise",
    artistCount: 150,
    bookingCount: 1000,
    team: [
      { role: "admin", count: 5 },
      { role: "booking_manager", count: 10 },
      { role: "artist_manager", count: 8 },
      { role: "marketing", count: 5 },
      { role: "finance", count: 4 },
      { role: "assistant", count: 5 },
      { role: "read_only", count: 3 },
    ],
  },
];

export function getAgencyOrgTemplate(slug: AgencyScenarioSlug): AgencyOrgTemplate {
  return AGENCY_ORG_TEMPLATES.find((t) => t.slug === slug) ?? AGENCY_ORG_TEMPLATES[0]!;
}

/** Flatten template team slots into individual member creation jobs. */
export function expandAgencyTeamTemplate(template: AgencyOrgTemplate): { role: AgencyMemberRole; slot: number }[] {
  const slots: { role: AgencyMemberRole; slot: number }[] = [];
  for (const { role, count } of template.team) {
    for (let slot = 0; slot < count; slot++) {
      slots.push({ role, slot });
    }
  }
  return slots;
}

/** Legacy export for UI lists — mirrors template metadata. */
export const AGENCY_SCENARIOS = AGENCY_ORG_TEMPLATES.map((t) => ({
  slug: t.slug,
  label: t.label,
  description: t.description,
  artistCount: t.artistCount,
  plan: t.plan,
  bookingCount: t.bookingCount,
}));
