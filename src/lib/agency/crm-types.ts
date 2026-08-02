import type { CrmContactTypeId, CrmPipelineStageId } from "@/lib/agency/crm-constants";

export type CrmBooking = {
  id: string;
  organization_id: string;
  created_by: string;
  assigned_to: string | null;
  stage: CrmPipelineStageId;
  stage_changed_at: string;
  title: string;
  artist_id: string | null;
  venue_id: string | null;
  event_id: string | null;
  sponsor_contact_id: string | null;
  booking_contact_id: string | null;
  event_type: string;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  expected_attendance: number | null;
  ticket_price_cents: number | null;
  projected_revenue_cents: number;
  actual_revenue_cents: number;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_website: string | null;
  social_links: Record<string, string>;
  notes: string | null;
  internal_notes: string | null;
  recording_status: string;
  replay_status: string;
  priority: string;
  custom_fields: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  artists?: { id: string; slug: string; stage_name: string; banner_url: string | null } | null;
  venues?: { id: string; slug: string; name: string } | null;
  sponsor_contact?: CrmContact | null;
  booking_contact?: CrmContact | null;
};

export type CrmContact = {
  id: string;
  organization_id: string;
  contact_type: CrmContactTypeId;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: Record<string, unknown>;
  website: string | null;
  social_links: Record<string, string>;
  relationship_score: number;
  tags: string[];
  notes: string | null;
  linked_artist_id: string | null;
  linked_venue_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmTask = {
  id: string;
  organization_id: string;
  booking_id: string;
  title: string;
  description: string | null;
  priority: string;
  owner_id: string | null;
  due_at: string | null;
  status: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  attachments: unknown[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  owner?: { display_name: string | null; avatar_url: string | null } | null;
};

export type CrmActivity = {
  id: string;
  organization_id: string;
  booking_id: string | null;
  actor_user_id: string | null;
  activity_type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: { display_name: string | null; avatar_url: string | null } | null;
};

export type CrmPayment = {
  id: string;
  booking_id: string;
  payment_type: string;
  amount_cents: number;
  currency: string;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  description: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  created_at: string;
};

export type CrmContract = {
  id: string;
  booking_id: string;
  title: string;
  storage_path: string | null;
  version: number;
  status: string;
  signed_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type CrmFile = {
  id: string;
  booking_id: string | null;
  contact_id: string | null;
  category: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  version: number;
  created_at: string;
};

export type CrmChecklistItem = {
  id: string;
  booking_id: string;
  checklist_type: "marketing" | "performance";
  item_key: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
};

export type CrmDashboardPayload = {
  upcomingEvents: CrmBooking[];
  todaysTasks: CrmTask[];
  pendingContracts: CrmContract[];
  pendingPayments: CrmPayment[];
  recentActivity: CrmActivity[];
  recentMessages: { id: string; subject: string | null; updated_at: string }[];
  upcomingDeadlines: CrmTask[];
  bookingsByStage: { stage: string; count: number }[];
  monthlyRevenueCents: number;
  expectedRevenueCents: number;
  ticketSalesCount: number;
  topArtists: { name: string; revenueCents: number; bookings: number }[];
  recentSponsorships: { id: string; title: string; status: string }[];
  calendarPreview: { id: string; title: string; starts_at: string }[];
  performanceMetrics: {
    conversionRate: number;
    avgTicketPriceCents: number;
    repeatCustomers: number;
    activeBookings: number;
    completedBookings: number;
  };
};

export type CrmAnalyticsPayload = {
  agencyRevenueCents: number;
  revenueByArtist: { name: string; cents: number }[];
  revenueByEvent: { title: string; cents: number }[];
  ticketSales: { month: string; count: number }[];
  attendance: { month: string; viewers: number }[];
  conversionRate: number;
  avgTicketPriceCents: number;
  repeatCustomers: number;
  sponsorRevenueCents: number;
  growthTrend: { month: string; revenueCents: number; bookings: number }[];
};

export type CrmSearchResult = {
  type: "booking" | "contact" | "task" | "contract" | "payment";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};
