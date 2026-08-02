export type AgencyFinancePayload = {
  overview: {
    monthlyRevenueCents: number;
    yearlyRevenueCents: number;
    grossRevenueCents: number;
    netRevenueCents: number;
    platformFeesCents: number;
    agencyRevenueCents: number;
    managerRevenueCents: number;
    projectedRevenueCents: number;
    recurringRevenueCents: number;
    outstandingPaymentsCents: number;
    pendingPayoutsCents: number;
    completedPayoutsCents: number;
    refundsCents: number;
    taxEstimateCents: number;
    cashFlowCents: number;
  };
  byArtist: { name: string; cents: number }[];
  byEvent: { name: string; cents: number }[];
  byVenue: { name: string; cents: number }[];
  byGenre: { name: string; cents: number }[];
  bySponsor: { name: string; cents: number }[];
  streams: {
    ticketRevenueCents: number;
    vipRevenueCents: number;
    backstagePassRevenueCents: number;
    ppvRevenueCents: number;
    subscriptionRevenueCents: number;
  };
  trends: { month: string; grossCents: number; netCents: number }[];
  payouts: AgencyPayoutRow[];
  commissions: AgencyCommissionRow[];
  invoices: AgencyInvoiceRow[];
  payoutRules: AgencyPayoutRuleRow[];
  profitLoss: AgencyProfitLossRow[];
};

export type AgencyPayoutRow = {
  id: string;
  artist_id: string | null;
  amount_cents: number;
  status: string;
  description: string | null;
  paid_at: string | null;
  created_at: string;
};

export type AgencyCommissionRow = {
  id: string;
  manager_user_id: string;
  artist_id: string | null;
  commission_percent: number;
  earned_cents: number;
  paid_cents: number;
  status: string;
};

export type AgencyInvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_type: string;
  recipient_name: string;
  amount_cents: number;
  status: string;
  due_at: string | null;
  created_at: string;
};

export type AgencyPayoutRuleRow = {
  id: string;
  name: string;
  splits: { role: string; percent: number }[];
  is_default: boolean;
};

export type AgencyProfitLossRow = {
  label: string;
  incomeCents: number;
  expensesCents: number;
  netProfitCents: number;
  marginPercent: number;
};

export type AgencyOperationsPayload = {
  todaysTasks: { id: string; title: string; due_at: string | null; priority: string; status: string }[];
  approvalsNeeded: { id: string; title: string; status: string; entity_type: string }[];
  upcomingEvents: { id: string; title: string; starts_at: string }[];
  contractExpirations: { id: string; title: string; expires_at: string }[];
  paymentDeadlines: { id: string; description: string; due_at: string; amount_cents: number }[];
  staffWorkload: { user_id: string; name: string; open_tasks: number; overdue_tasks: number }[];
};

export type AgencyMarketingPayload = {
  campaigns: { id: string; name: string; channel: string; status: string; scheduled_at: string | null }[];
  countdowns: { id: string; event_starts_at: string; milestones: { label: string; days_before: number }[] }[];
  referrals: { id: string; code: string; label: string | null; clicks: number; sales: number; revenue_cents: number }[];
  creditBalanceCents: number;
  templates: { channel: string; label: string; preview: string }[];
};

export type AgencyIntelligencePayload = {
  artists: AgencyArtistIntelligenceRow[];
  forecasts: { period_label: string; projected_cents: number; forecast_type: string; risk_level: string | null }[];
  collaborations: { artist_a: string; artist_b: string; reason: string; score: number }[];
};

export type AgencyArtistIntelligenceRow = {
  artist_id: string;
  stage_name: string;
  fan_growth_score: number;
  health_score: number;
  rising_star_score: number;
  metrics: {
    followerGrowth: number;
    ticketGrowth: number;
    revenueGrowth: number;
    attendanceGrowth: number;
    engagement: number;
    retention: number;
  };
  recommendations: string[];
  health: {
    audienceGrowth: number;
    revenue: number;
    attendance: number;
    eventFrequency: number;
    sponsorInterest: number;
    marketingEffectiveness: number;
    cancellationRate: number;
  };
};

export type AgencyAssetsPayload = {
  folders: { id: string; name: string; parent_id: string | null }[];
  assets: { id: string; name: string; category: string; tags: string[]; created_at: string }[];
  articles: { id: string; title: string; category: string; updated_at: string }[];
};

export type AgencyFestivalRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  starts_at: string;
  ends_at: string;
  artist_count: number;
  pass_count: number;
};

export type AgencyFestivalDetail = AgencyFestivalRow & {
  description: string | null;
  branding: Record<string, unknown>;
  artists: { artist_id: string; stage_name: string; venue_name: string | null; slot_starts_at: string | null }[];
  passes: { id: string; name: string; pass_type: string; price_cents: number; sold_count: number }[];
  sponsors: { id: string; package_name: string; amount_cents: number }[];
};

export type AgencySponsorMatchRow = {
  id: string;
  artist_name: string;
  sponsor_name: string;
  match_score: number;
  reasons: string[];
};
