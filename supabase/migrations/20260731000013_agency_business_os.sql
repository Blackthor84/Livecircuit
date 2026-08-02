-- Agency Business OS — finance, marketing, operations, intelligence, assets, festivals

CREATE TYPE public.agency_payout_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'cancelled');
CREATE TYPE public.agency_invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void', 'refunded');
CREATE TYPE public.agency_invoice_type AS ENUM (
  'invoice', 'receipt', 'statement', 'credit_note', 'refund_receipt', 'tax_document', 'agency_billing', 'sponsor_billing'
);
CREATE TYPE public.agency_approval_status AS ENUM (
  'draft', 'internal_review', 'manager_approval', 'agency_approval', 'legal_approval', 'ready_to_publish', 'published'
);
CREATE TYPE public.agency_campaign_channel AS ENUM (
  'instagram', 'facebook', 'threads', 'x', 'linkedin', 'tiktok', 'email', 'sms', 'announcement', 'countdown', 'thank_you'
);
CREATE TYPE public.agency_campaign_status AS ENUM ('draft', 'scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE public.agency_festival_status AS ENUM ('draft', 'scheduled', 'on_sale', 'live', 'completed', 'cancelled');
CREATE TYPE public.agency_asset_category AS ENUM (
  'photo', 'logo', 'video', 'press_kit', 'media_kit', 'sponsor_asset', 'brand_guideline',
  'contract', 'invoice', 'social_graphic', 'other'
);

-- Revenue splits (artist 80%, agency 15%, manager 5%, etc.)
CREATE TABLE public.agency_payout_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  splits JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  manager_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payout_rule_id UUID REFERENCES public.agency_payout_rules(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.agency_payout_status NOT NULL DEFAULT 'pending',
  stripe_transfer_id TEXT,
  stripe_payout_id TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  manager_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  earned_cents INTEGER NOT NULL DEFAULT 0,
  paid_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'partial', 'paid')),
  period_label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  invoice_type public.agency_invoice_type NOT NULL DEFAULT 'invoice',
  invoice_number TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.agency_invoice_status NOT NULL DEFAULT 'draft',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  storage_path TEXT,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.agency_crm_bookings(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, invoice_number)
);

CREATE TABLE public.agency_royalty_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  gross_cents INTEGER NOT NULL DEFAULT 0,
  net_cents INTEGER NOT NULL DEFAULT 0,
  splits JSONB NOT NULL DEFAULT '[]'::jsonb,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel public.agency_campaign_channel NOT NULL,
  content TEXT NOT NULL,
  status public.agency_campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.agency_crm_bookings(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_countdown_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.agency_crm_bookings(id) ON DELETE SET NULL,
  event_starts_at TIMESTAMPTZ NOT NULL,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  sales INTEGER NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE TABLE public.agency_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT NOT NULL,
  status public.agency_approval_status NOT NULL DEFAULT 'draft',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_asset_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.agency_asset_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.agency_asset_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category public.agency_asset_category NOT NULL DEFAULT 'other',
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  video_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_artist_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  fan_growth_score INTEGER NOT NULL DEFAULT 50 CHECK (fan_growth_score >= 0 AND fan_growth_score <= 100),
  health_score INTEGER NOT NULL DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),
  rising_star_score INTEGER NOT NULL DEFAULT 50 CHECK (rising_star_score >= 0 AND rising_star_score <= 100),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  collaboration_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, artist_id)
);

CREATE TABLE public.agency_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  forecast_type TEXT NOT NULL,
  period_label TEXT NOT NULL,
  projected_value NUMERIC(14,2),
  projected_cents INTEGER,
  confidence NUMERIC(3,2),
  risk_level TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_festivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status public.agency_festival_status NOT NULL DEFAULT 'draft',
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  landing_page_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE public.agency_festival_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.agency_festivals(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  slot_starts_at TIMESTAMPTZ,
  slot_ends_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (festival_id, artist_id)
);

CREATE TABLE public.agency_festival_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.agency_festivals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pass_type TEXT NOT NULL CHECK (pass_type IN ('single', 'weekend', 'premium', 'vip', 'festival')),
  price_cents INTEGER NOT NULL,
  quantity_limit INTEGER,
  sold_count INTEGER NOT NULL DEFAULT 0,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_festival_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.agency_festivals(id) ON DELETE CASCADE,
  sponsor_contact_id UUID REFERENCES public.agency_crm_contacts(id) ON DELETE SET NULL,
  package_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_sponsor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agency_organizations(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  sponsor_contact_id UUID NOT NULL REFERENCES public.agency_crm_contacts(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, artist_id, sponsor_contact_id)
);

-- Indexes
CREATE INDEX agency_payouts_org_idx ON public.agency_payouts (organization_id, status);
CREATE INDEX agency_commissions_org_idx ON public.agency_commissions (organization_id, manager_user_id);
CREATE INDEX agency_invoices_org_idx ON public.agency_invoices (organization_id, status);
CREATE INDEX agency_campaigns_org_idx ON public.agency_marketing_campaigns (organization_id, status);
CREATE INDEX agency_assets_org_idx ON public.agency_assets (organization_id, category);
CREATE INDEX agency_festivals_org_idx ON public.agency_festivals (organization_id, status);
CREATE INDEX agency_intelligence_org_idx ON public.agency_artist_intelligence (organization_id, artist_id);
CREATE INDEX agency_approvals_org_idx ON public.agency_approval_requests (organization_id, status);
CREATE INDEX agency_referrals_org_idx ON public.agency_referral_links (organization_id);

-- RLS
ALTER TABLE public.agency_payout_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_royalty_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_countdown_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_asset_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_artist_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_festival_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_festival_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_festival_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_sponsor_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency OS read" ON public.agency_payout_rules FOR SELECT
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Agency OS write finance" ON public.agency_payout_rules FOR ALL
  USING (public.agency_crm_can_read_finance(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency payouts read" ON public.agency_payouts FOR SELECT
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Agency payouts write" ON public.agency_payouts FOR ALL
  USING (public.agency_crm_can_read_finance(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency commissions access" ON public.agency_commissions FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency invoices access" ON public.agency_invoices FOR ALL
  USING (public.agency_crm_can_read_finance(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency royalty statements access" ON public.agency_royalty_statements FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency campaigns access" ON public.agency_marketing_campaigns FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency countdown access" ON public.agency_countdown_schedules FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency referrals access" ON public.agency_referral_links FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency approvals access" ON public.agency_approval_requests FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency asset folders access" ON public.agency_asset_folders FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency assets access" ON public.agency_assets FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency knowledge access" ON public.agency_knowledge_articles FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency intelligence access" ON public.agency_artist_intelligence FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency forecasts access" ON public.agency_forecasts FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency festivals access" ON public.agency_festivals FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Agency festival artists access" ON public.agency_festival_artists FOR ALL
  USING (EXISTS (SELECT 1 FROM public.agency_festivals f WHERE f.id = festival_id AND (public.is_agency_member(f.organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()))));

CREATE POLICY "Agency festival passes access" ON public.agency_festival_passes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.agency_festivals f WHERE f.id = festival_id AND (public.is_agency_member(f.organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()))));

CREATE POLICY "Agency festival sponsors access" ON public.agency_festival_sponsors FOR ALL
  USING (EXISTS (SELECT 1 FROM public.agency_festivals f WHERE f.id = festival_id AND (public.is_agency_member(f.organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()))));

CREATE POLICY "Agency sponsor matches access" ON public.agency_sponsor_matches FOR ALL
  USING (public.is_agency_member(organization_id, auth.uid()) OR public.is_platform_admin(auth.uid()));
