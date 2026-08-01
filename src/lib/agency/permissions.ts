import type { AgencyMemberRole, AgencyPermissions, AgencyPlan } from "@/lib/agency/types";

export const AGENCY_PLANS: {
  id: AgencyPlan;
  name: string;
  priceLabel: string;
  priceCents: number | null;
  popular?: boolean;
  features: string[];
  artistLimit: number | null;
  teamLimit: number | null;
}[] = [
  {
    id: "starter",
    name: "Starter",
    priceLabel: "$149/month",
    priceCents: 14900,
    features: [
      "Up to 10 artists",
      "Unlimited booking requests",
      "Unlimited digital venues",
      "Basic analytics",
      "2 team members",
    ],
    artistLimit: 10,
    teamLimit: 2,
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$499/month",
    priceCents: 49900,
    popular: true,
    features: [
      "Up to 100 artists",
      "Unlimited booking requests",
      "Unlimited digital venues",
      "Unlimited performances",
      "Unlimited states",
      "Advanced analytics",
      "10 team members",
      "Verified Agency badge",
      "Priority support",
    ],
    artistLimit: 100,
    teamLimit: 10,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom pricing",
    priceCents: null,
    features: [
      "Unlimited artists",
      "Unlimited users",
      "Unlimited teams",
      "White label portal",
      "API access",
      "CRM integrations",
      "Dedicated account manager",
      "Custom reporting",
      "Stadium access (future)",
    ],
    artistLimit: null,
    teamLimit: null,
  },
];

export function getAgencyPlanLimits(plan: AgencyPlan) {
  return AGENCY_PLANS.find((p) => p.id === plan) ?? AGENCY_PLANS[0];
}

const ROLE_DEFAULTS: Record<AgencyMemberRole, AgencyPermissions> = {
  owner: {
    manage_roster: true,
    book_events: true,
    view_revenue: true,
    manage_team: true,
    manage_sponsorship: true,
    export_data: true,
  },
  admin: {
    manage_roster: true,
    book_events: true,
    view_revenue: true,
    manage_team: true,
    manage_sponsorship: true,
    export_data: true,
  },
  booking_manager: {
    manage_roster: true,
    book_events: true,
    view_revenue: true,
    manage_team: false,
    manage_sponsorship: false,
    export_data: true,
  },
  artist_manager: {
    manage_roster: true,
    book_events: true,
    view_revenue: false,
    manage_team: false,
    manage_sponsorship: false,
    export_data: false,
  },
  assistant: {
    manage_roster: false,
    book_events: false,
    view_revenue: false,
    manage_team: false,
    manage_sponsorship: false,
    export_data: false,
  },
  marketing: {
    manage_roster: false,
    book_events: false,
    view_revenue: false,
    manage_team: false,
    manage_sponsorship: true,
    export_data: false,
  },
  finance: {
    manage_roster: false,
    book_events: false,
    view_revenue: true,
    manage_team: false,
    manage_sponsorship: false,
    export_data: true,
  },
  read_only: {},
};

export function getAgencyPermissions(role: AgencyMemberRole): AgencyPermissions {
  return ROLE_DEFAULTS[role] ?? {};
}

export function hasAgencyPermission(
  role: AgencyMemberRole,
  permission: keyof AgencyPermissions
): boolean {
  return Boolean(getAgencyPermissions(role)[permission]);
}

export const AGENCY_MEMBER_ROLE_LABELS: Record<AgencyMemberRole, string> = {
  owner: "Agency Owner",
  admin: "Agency Admin",
  booking_manager: "Booking Manager",
  artist_manager: "Artist Manager",
  assistant: "Assistant",
  marketing: "Marketing",
  finance: "Finance",
  read_only: "Read-only",
};
