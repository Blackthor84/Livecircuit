-- Founding Partner Program, renewal rights, sponsor scores, achievements, CRM pipeline, digital contracts

CREATE TYPE public.founding_partner_application_status AS ENUM (
  'pending',
  'reviewing',
  'approved',
  'declined',
  'withdrawn'
);

CREATE TYPE public.sponsorship_pipeline_stage AS ENUM (
  'lead',
  'contacted',
  'meeting_scheduled',
  'proposal_sent',
  'negotiating',
  'contract_review',
  'approved',
  'signed',
  'active',
  'renewal',
  'expired',
  'lost'
);

-- Program configuration (admin sets max slots; default 50)
CREATE TABLE IF NOT EXISTS public.founding_partner_program_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  max_slots INTEGER NOT NULL DEFAULT 50,
  program_active BOOLEAN NOT NULL DEFAULT true,
  early_access_enabled BOOLEAN NOT NULL DEFAULT true,
  preferred_pricing_percent INTEGER NOT NULL DEFAULT 10,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.founding_partner_program_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Founding partner applications (persisted, not notification-only)
CREATE TABLE IF NOT EXISTS public.founding_partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  company_website TEXT,
  message TEXT,
  organization_id UUID REFERENCES public.sponsor_organizations(id) ON DELETE SET NULL,
  status public.founding_partner_application_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  decline_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Approved founding partners (platform-level, permanent recognition)
CREATE TABLE IF NOT EXISTS public.founding_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.founding_partner_applications(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_revenue_cents INTEGER NOT NULL DEFAULT 0,
  show_on_partners_page BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_founding_partners_org ON public.founding_partners(organization_id);

-- First right of renewal on premium contracts
ALTER TABLE public.premium_sponsorship_contracts
  ADD COLUMN IF NOT EXISTS first_right_of_renewal_days INTEGER,
  ADD COLUMN IF NOT EXISTS renewal_window_starts_at DATE,
  ADD COLUMN IF NOT EXISTS renewal_window_ends_at DATE,
  ADD COLUMN IF NOT EXISTS renewal_declined_at TIMESTAMPTZ;

-- Sponsor score cache (recomputed periodically or on demand)
CREATE TABLE IF NOT EXISTS public.sponsor_scores (
  organization_id UUID PRIMARY KEY REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  years_on_platform NUMERIC(6,2) NOT NULL DEFAULT 0,
  renewal_rate_percent INTEGER NOT NULL DEFAULT 0,
  total_spent_cents INTEGER NOT NULL DEFAULT 0,
  sponsorship_count INTEGER NOT NULL DEFAULT 0,
  payment_score INTEGER NOT NULL DEFAULT 100,
  community_rating NUMERIC(3,2),
  response_time_hours NUMERIC(8,2),
  long_term_bonus INTEGER NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sponsor achievements (separate from fan achievements)
CREATE TABLE IF NOT EXISTS public.sponsor_achievement_defs (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_key TEXT,
  tier INTEGER NOT NULL DEFAULT 0,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.sponsor_organization_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  achievement_slug TEXT NOT NULL REFERENCES public.sponsor_achievement_defs(slug),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, achievement_slug)
);

INSERT INTO public.sponsor_achievement_defs (slug, name, description, icon_key, tier, sort_order) VALUES
  ('first_sponsor', 'First Sponsor', 'First sponsorship on LiveCircuit.', 'star', 1, 1),
  ('founding_partner', 'Founding Partner', 'Permanent Founding Partner recognition.', 'crown', 100, 2),
  ('million_dollar_sponsor', 'Million Dollar Sponsor', 'One million dollars in total sponsorship value.', 'dollar', 90, 3),
  ('ten_year_partner', 'Ten-Year Partner', 'A decade of partnership with LiveCircuit.', 'calendar', 85, 4),
  ('national_sponsor', 'National Sponsor', 'Platform-wide official partner.', 'globe', 80, 5),
  ('statewide_sponsor', 'Statewide Sponsor', 'Exclusive partner across an entire state.', 'map', 75, 6),
  ('events_100', '100 Events Sponsored', 'Sponsored 100 live events.', 'ticket', 60, 7),
  ('events_1000', '1000 Events Sponsored', 'Sponsored 1,000 live events.', 'ticket', 95, 8),
  ('top_sponsor_year', 'Top Sponsor of the Year', 'Highest sponsorship value in a calendar year.', 'trophy', 98, 9)
ON CONFLICT (slug) DO NOTHING;

-- CRM pipeline
CREATE TABLE IF NOT EXISTS public.sponsorship_pipeline_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.sponsor_organizations(id) ON DELETE SET NULL,
  organization_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  title TEXT NOT NULL,
  stage public.sponsorship_pipeline_stage NOT NULL DEFAULT 'lead',
  slot_type_slug TEXT REFERENCES public.sponsorship_slot_types(slug),
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  estimated_value_cents INTEGER NOT NULL DEFAULT 0,
  assigned_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.premium_sponsorship_contracts(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.founding_partner_applications(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sponsorship_pipeline_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.sponsorship_pipeline_deals(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL DEFAULT 'note',
  subject TEXT,
  body TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_deals_stage ON public.sponsorship_pipeline_deals(stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_interactions_deal ON public.sponsorship_pipeline_interactions(deal_id, created_at DESC);

-- Digital contracts with version history
CREATE TABLE IF NOT EXISTS public.sponsorship_contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.premium_sponsorship_contracts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  signed_at TIMESTAMPTZ,
  signed_by_name TEXT,
  signed_by_email TEXT,
  signature_data TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, version)
);

CREATE INDEX IF NOT EXISTS idx_contract_documents_contract ON public.sponsorship_contract_documents(contract_id, version DESC);

-- Schedule renewal window when first_right_of_renewal_days is set
CREATE OR REPLACE FUNCTION public.sync_renewal_window_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.first_right_of_renewal_days IS NOT NULL AND NEW.first_right_of_renewal_days > 0
     AND NEW.contract_ends_at IS NOT NULL THEN
    NEW.renewal_window_starts_at := (NEW.contract_ends_at - (NEW.first_right_of_renewal_days || ' days')::interval)::date;
    NEW.renewal_window_ends_at := NEW.contract_ends_at;
  ELSE
    NEW.renewal_window_starts_at := NULL;
    NEW.renewal_window_ends_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS premium_contracts_renewal_window ON public.premium_sponsorship_contracts;
CREATE TRIGGER premium_contracts_renewal_window
  BEFORE INSERT OR UPDATE OF first_right_of_renewal_days, contract_ends_at
  ON public.premium_sponsorship_contracts
  FOR EACH ROW EXECUTE FUNCTION public.sync_renewal_window_dates();

-- RLS
ALTER TABLE public.founding_partner_program_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founding_partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founding_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_achievement_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_organization_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_pipeline_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_pipeline_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founding settings public read" ON public.founding_partner_program_settings FOR SELECT USING (true);
CREATE POLICY "Admin manages founding settings" ON public.founding_partner_program_settings FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Founding apps insert public" ON public.founding_partner_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Founding apps read own email or admin" ON public.founding_partner_applications FOR SELECT
  USING (public.is_admin_profile());
CREATE POLICY "Admin manages founding apps" ON public.founding_partner_applications FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Founding partners public read" ON public.founding_partners FOR SELECT
  USING (show_on_partners_page = true OR public.is_admin_profile());
CREATE POLICY "Admin manages founding partners" ON public.founding_partners FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Sponsor scores org read" ON public.sponsor_scores FOR SELECT
  USING (
    public.is_admin_profile() OR
    EXISTS (SELECT 1 FROM public.sponsor_organization_members m WHERE m.organization_id = sponsor_scores.organization_id AND m.user_id = auth.uid())
  );
CREATE POLICY "Admin manages sponsor scores" ON public.sponsor_scores FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Sponsor achievement defs public read" ON public.sponsor_achievement_defs FOR SELECT USING (is_active = true);
CREATE POLICY "Sponsor achievements public read" ON public.sponsor_organization_achievements FOR SELECT USING (true);
CREATE POLICY "Admin manages sponsor achievements" ON public.sponsor_organization_achievements FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Pipeline admin only" ON public.sponsorship_pipeline_deals FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
CREATE POLICY "Pipeline interactions admin" ON public.sponsorship_pipeline_interactions FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Contract docs org read" ON public.sponsorship_contract_documents FOR SELECT
  USING (
    public.is_admin_profile() OR
    EXISTS (
      SELECT 1 FROM public.premium_sponsorship_contracts c
      JOIN public.sponsor_organization_members m ON m.organization_id = c.organization_id
      WHERE c.id = sponsorship_contract_documents.contract_id AND m.user_id = auth.uid()
    )
  );
CREATE POLICY "Admin manages contract docs" ON public.sponsorship_contract_documents FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE TRIGGER set_updated_at_founding_applications
  BEFORE UPDATE ON public.founding_partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_pipeline_deals
  BEFORE UPDATE ON public.sponsorship_pipeline_deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_founding_settings
  BEFORE UPDATE ON public.founding_partner_program_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
