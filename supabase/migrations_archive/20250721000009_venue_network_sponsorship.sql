-- Milestone 1 (Venue Network): schema, RLS, seed venues & reference data

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.venue_loyalty_level AS ENUM (
  'bronze',
  'silver',
  'gold',
  'diamond'
);

CREATE TYPE public.sponsorship_product AS ENUM (
  'venue_naming_rights',
  'digital_billboard',
  'homepage_banner',
  'concourse_booth',
  'pre_show_ad',
  'vip_lounge',
  'exclusive_promotion',
  'merch_sponsorship',
  'category_sponsorship',
  'founding_sponsor'
);

CREATE TYPE public.sponsor_member_role AS ENUM (
  'owner',
  'analyst',
  'viewer'
);

CREATE TYPE public.sponsor_campaign_status AS ENUM (
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled'
);

CREATE TYPE public.concourse_shop_kind AS ENUM (
  'merchandise',
  'food_sponsor',
  'advertisement_kiosk',
  'photo_booth',
  'meet_and_greet',
  'event_board',
  'venue_directory',
  'local_business',
  'charity',
  'information_desk',
  'interactive'
);

CREATE TYPE public.loyalty_transaction_reason AS ENUM (
  'attendance',
  'merchandise',
  'check_in',
  'referral',
  'artist_support',
  'review',
  'share',
  'admin_adjustment',
  'reward_redemption'
);

CREATE TYPE public.venue_post_kind AS ENUM (
  'discussion',
  'achievement',
  'ranking'
);

-- ---------------------------------------------------------------------------
-- Venue taxonomy & venues
-- ---------------------------------------------------------------------------

CREATE TABLE public.venue_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon_key TEXT NOT NULL DEFAULT 'arena',
  description TEXT,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  landing_template_key TEXT NOT NULL DEFAULT 'default',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  state_code TEXT,
  country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  state_id UUID REFERENCES public.states(id) ON DELETE SET NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  venue_type_id UUID NOT NULL REFERENCES public.venue_types(id) ON DELETE RESTRICT,
  capacity INTEGER NOT NULL DEFAULT 50000,
  soft_capacity_limit INTEGER,
  description TEXT,
  banner_url TEXT,
  hero_image_url TEXT,
  theme_palette JSONB NOT NULL DEFAULT '{}'::jsonb,
  popularity_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
  current_visitors INTEGER NOT NULL DEFAULT 0,
  follower_count INTEGER NOT NULL DEFAULT 0,
  featured_sponsor_org_id UUID,
  founding_sponsor_org_id UUID,
  vr_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  concourse_layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  weather_placeholder JSONB NOT NULL DEFAULT '{}'::jsonb,
  statistics JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venues_country ON public.venues(country_id);
CREATE INDEX idx_venues_state ON public.venues(state_id);
CREATE INDEX idx_venues_type ON public.venues(venue_type_id);
CREATE INDEX idx_venues_popularity ON public.venues(popularity_score DESC) WHERE is_active = true;
CREATE INDEX idx_venues_region ON public.venues(region);

CREATE TABLE public.venue_featured_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  featured_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, artist_id)
);

CREATE TABLE public.venue_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  assets JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_palette JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.venue_theme_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES public.venue_themes(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_venue_one_active_theme
  ON public.venue_theme_assignments(venue_id)
  WHERE is_active = true AND ends_at IS NULL;

CREATE INDEX idx_venue_theme_assignments_window
  ON public.venue_theme_assignments(venue_id, starts_at, ends_at);

-- Simultaneous events: optional venue link (many events per venue)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_room_label TEXT;

CREATE INDEX idx_events_venue_status ON public.events(venue_id, status)
  WHERE venue_id IS NOT NULL;

CREATE INDEX idx_events_venue_scheduled ON public.events(venue_id, scheduled_at DESC)
  WHERE venue_id IS NOT NULL;

CREATE INDEX idx_events_venue_live ON public.events(venue_id)
  WHERE venue_id IS NOT NULL AND status = 'live';

-- ---------------------------------------------------------------------------
-- Sponsors
-- ---------------------------------------------------------------------------

CREATE TABLE public.sponsor_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  billing_email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sponsor_organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.sponsor_member_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_sponsor_members_user ON public.sponsor_organization_members(user_id);

ALTER TABLE public.venues
  ADD CONSTRAINT venues_featured_sponsor_fkey
  FOREIGN KEY (featured_sponsor_org_id) REFERENCES public.sponsor_organizations(id) ON DELETE SET NULL;

ALTER TABLE public.venues
  ADD CONSTRAINT venues_founding_sponsor_fkey
  FOREIGN KEY (founding_sponsor_org_id) REFERENCES public.sponsor_organizations(id) ON DELETE SET NULL;

CREATE TABLE public.venue_sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  product public.sponsorship_product NOT NULL,
  display_name TEXT,
  is_founding_sponsor BOOLEAN NOT NULL DEFAULT false,
  priority_renewal BOOLEAN NOT NULL DEFAULT false,
  launch_pricing_cents INTEGER,
  contract_starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contract_ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  history_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_venue_one_founding_sponsor
  ON public.venue_sponsorships(venue_id)
  WHERE is_founding_sponsor = true AND is_active = true;

CREATE INDEX idx_venue_sponsorships_org ON public.venue_sponsorships(organization_id);
CREATE INDEX idx_venue_sponsorships_venue ON public.venue_sponsorships(venue_id, is_active);

CREATE TABLE public.sponsor_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status public.sponsor_campaign_status NOT NULL DEFAULT 'draft',
  budget_cents INTEGER,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  targeting JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sponsor_campaigns_org ON public.sponsor_campaigns(organization_id, status);

CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  creative_type TEXT NOT NULL DEFAULT 'image',
  asset_url TEXT,
  click_url TEXT,
  html_snippet TEXT,
  animation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_interactive BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_advertisements_campaign ON public.advertisements(campaign_id);

CREATE TABLE public.billboard_location_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.venue_billboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  location_type_id UUID NOT NULL REFERENCES public.billboard_location_types(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  zone_key TEXT,
  max_simultaneous_ads INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, slug)
);

CREATE INDEX idx_venue_billboards_venue ON public.venue_billboards(venue_id) WHERE is_active = true;

CREATE TABLE public.advertisement_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  billboard_id UUID NOT NULL REFERENCES public.venue_billboards(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_schedules_billboard_active
  ON public.advertisement_schedules(billboard_id, starts_at, ends_at)
  WHERE is_active = true;

CREATE TABLE public.sponsor_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_bps INTEGER,
  max_redemptions INTEGER,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, code)
);

CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.sponsor_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Concourse
-- ---------------------------------------------------------------------------

CREATE TABLE public.concourse_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  sponsor_organization_id UUID REFERENCES public.sponsor_organizations(id) ON DELETE SET NULL,
  kind public.concourse_shop_kind NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  zone JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, slug)
);

CREATE INDEX idx_concourse_shops_venue ON public.concourse_shops(venue_id, sort_order);

CREATE TABLE public.concourse_shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.concourse_shops(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  external_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Community, reviews, loyalty
-- ---------------------------------------------------------------------------

CREATE TABLE public.venue_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, user_id)
);

CREATE INDEX idx_venue_followers_user ON public.venue_followers(user_id);

CREATE TABLE public.venue_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, user_id)
);

CREATE TABLE public.venue_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind public.venue_post_kind NOT NULL DEFAULT 'discussion',
  title TEXT,
  body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_posts_venue ON public.venue_posts(venue_id, created_at DESC);

CREATE TABLE public.venue_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.venue_loyalty_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  level public.venue_loyalty_level NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, user_id)
);

CREATE TABLE public.venue_loyalty_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_profile_id UUID NOT NULL REFERENCES public.venue_loyalty_profiles(id) ON DELETE CASCADE,
  delta_points INTEGER NOT NULL,
  reason public.loyalty_transaction_reason NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_loyalty_ledger_profile ON public.venue_loyalty_ledger(loyalty_profile_id, created_at DESC);

CREATE TABLE public.venue_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  concourse_shop_id UUID REFERENCES public.concourse_shops(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_check_ins_venue_day ON public.venue_check_ins(venue_id, created_at DESC);

CREATE TABLE public.venue_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, slug)
);

CREATE TABLE public.user_venue_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id UUID NOT NULL REFERENCES public.venue_badges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (badge_id, user_id)
);

CREATE TABLE public.venue_leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  category TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, period_key, category)
);

-- ---------------------------------------------------------------------------
-- Analytics (rollup + raw ad telemetry)
-- ---------------------------------------------------------------------------

CREATE TABLE public.venue_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  bucket_date DATE NOT NULL,
  daily_visitors INTEGER NOT NULL DEFAULT 0,
  monthly_visitors_roll INTEGER NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  vip_purchases INTEGER NOT NULL DEFAULT 0,
  merchandise_cents BIGINT NOT NULL DEFAULT 0,
  avg_visit_seconds INTEGER NOT NULL DEFAULT 0,
  peak_concurrent INTEGER NOT NULL DEFAULT 0,
  repeat_visitor_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
  geo_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  heat_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_event_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, bucket_date)
);

CREATE INDEX idx_venue_analytics_daily_venue ON public.venue_analytics_daily(venue_id, bucket_date DESC);

CREATE TABLE public.sponsor_campaign_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  bucket_date DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  coupon_downloads INTEGER NOT NULL DEFAULT 0,
  avg_session_seconds INTEGER NOT NULL DEFAULT 0,
  revenue_attribution_cents BIGINT NOT NULL DEFAULT 0,
  demographics JSONB NOT NULL DEFAULT '{}'::jsonb,
  geo_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_event_ids UUID[] NOT NULL DEFAULT '{}',
  top_artist_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, bucket_date)
);

CREATE TABLE public.advertisement_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  billboard_id UUID REFERENCES public.venue_billboards(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_impressions_ad_time ON public.advertisement_impressions(advertisement_id, created_at DESC);
CREATE INDEX idx_ad_impressions_venue_time ON public.advertisement_impressions(venue_id, created_at DESC);

CREATE TABLE public.advertisement_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  billboard_id UUID REFERENCES public.venue_billboards(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_clicks_ad_time ON public.advertisement_clicks(advertisement_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_sponsor_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sponsor_organization_members m
    WHERE m.organization_id = org_id AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_profile()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_venue_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.venues SET follower_count = follower_count + 1 WHERE id = NEW.venue_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.venues SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.venue_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER venue_followers_count_ins
  AFTER INSERT ON public.venue_followers
  FOR EACH ROW EXECUTE FUNCTION public.sync_venue_follower_count();

CREATE TRIGGER venue_followers_count_del
  AFTER DELETE ON public.venue_followers
  FOR EACH ROW EXECUTE FUNCTION public.sync_venue_follower_count();

-- updated_at triggers
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'venue_types', 'venues', 'venue_featured_artists', 'venue_themes', 'venue_theme_assignments',
      'sponsor_organizations', 'sponsor_organization_members', 'venue_sponsorships',
      'sponsor_campaigns', 'advertisements', 'billboard_location_types', 'venue_billboards',
      'advertisement_schedules', 'sponsor_coupons', 'concourse_shops', 'concourse_shop_products',
      'venue_followers', 'venue_reviews', 'venue_posts', 'venue_announcements',
      'venue_loyalty_profiles', 'venue_badges', 'venue_analytics_daily',
      'sponsor_campaign_metrics_daily'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

ALTER TABLE public.venue_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_featured_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_theme_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billboard_location_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_billboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concourse_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concourse_shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_loyalty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_loyalty_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_venue_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_campaign_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_clicks ENABLE ROW LEVEL SECURITY;

-- Public catalog
CREATE POLICY "Venue types public read" ON public.venue_types FOR SELECT USING (true);
CREATE POLICY "Billboard location types public read" ON public.billboard_location_types FOR SELECT USING (true);
CREATE POLICY "Venue themes public read" ON public.venue_themes FOR SELECT USING (true);

CREATE POLICY "Venues public read active" ON public.venues FOR SELECT USING (is_active = true OR public.is_admin_profile());
CREATE POLICY "Admin manages venues" ON public.venues FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Venue featured artists public read" ON public.venue_featured_artists FOR SELECT USING (true);
CREATE POLICY "Admin manages venue featured artists" ON public.venue_featured_artists FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Venue theme assignments public read" ON public.venue_theme_assignments FOR SELECT USING (true);
CREATE POLICY "Admin manages venue theme assignments" ON public.venue_theme_assignments FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- Sponsors
CREATE POLICY "Sponsor org read members or admin" ON public.sponsor_organizations FOR SELECT
  USING (
    public.is_admin_profile()
    OR public.is_sponsor_org_member(id)
  );
CREATE POLICY "Admin manages sponsor orgs" ON public.sponsor_organizations FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Sponsor members read own membership" ON public.sponsor_organization_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_sponsor_org_member(organization_id) OR public.is_admin_profile());
CREATE POLICY "Admin manages sponsor members" ON public.sponsor_organization_members FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Venue sponsorships public read active" ON public.venue_sponsorships FOR SELECT
  USING (is_active = true OR public.is_admin_profile() OR public.is_sponsor_org_member(organization_id));
CREATE POLICY "Admin manages venue sponsorships" ON public.venue_sponsorships FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Sponsor campaigns org read" ON public.sponsor_campaigns FOR SELECT
  USING (public.is_admin_profile() OR public.is_sponsor_org_member(organization_id));
CREATE POLICY "Sponsor org manages campaigns" ON public.sponsor_campaigns FOR ALL
  USING (public.is_sponsor_org_member(organization_id) OR public.is_admin_profile())
  WITH CHECK (public.is_sponsor_org_member(organization_id) OR public.is_admin_profile());

CREATE POLICY "Advertisements org read" ON public.advertisements FOR SELECT
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.sponsor_campaigns c
      WHERE c.id = campaign_id AND public.is_sponsor_org_member(c.organization_id)
    )
    OR (is_active = true)
  );
CREATE POLICY "Sponsor org manages advertisements" ON public.advertisements FOR ALL
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.sponsor_campaigns c
      WHERE c.id = campaign_id AND public.is_sponsor_org_member(c.organization_id)
    )
  )
  WITH CHECK (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.sponsor_campaigns c
      WHERE c.id = campaign_id AND public.is_sponsor_org_member(c.organization_id)
    )
  );

CREATE POLICY "Venue billboards public read" ON public.venue_billboards FOR SELECT USING (is_active = true OR public.is_admin_profile());
CREATE POLICY "Admin manages venue billboards" ON public.venue_billboards FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Ad schedules public read active" ON public.advertisement_schedules FOR SELECT
  USING (is_active = true OR public.is_admin_profile());
CREATE POLICY "Sponsor manages ad schedules" ON public.advertisement_schedules FOR ALL
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.advertisements a
      JOIN public.sponsor_campaigns c ON c.id = a.campaign_id
      WHERE a.id = advertisement_id AND public.is_sponsor_org_member(c.organization_id)
    )
  )
  WITH CHECK (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.advertisements a
      JOIN public.sponsor_campaigns c ON c.id = a.campaign_id
      WHERE a.id = advertisement_id AND public.is_sponsor_org_member(c.organization_id)
    )
  );

CREATE POLICY "Coupons public read active" ON public.sponsor_coupons FOR SELECT USING (true);
CREATE POLICY "Sponsor manages coupons" ON public.sponsor_coupons FOR ALL
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.sponsor_campaigns c
      WHERE c.id = campaign_id AND public.is_sponsor_org_member(c.organization_id)
    )
  )
  WITH CHECK (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.sponsor_campaigns c
      WHERE c.id = campaign_id AND public.is_sponsor_org_member(c.organization_id)
    )
  );

CREATE POLICY "Coupon redemptions read own" ON public.coupon_redemptions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin_profile());
CREATE POLICY "Coupon redemptions insert own" ON public.coupon_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Concourse
CREATE POLICY "Concourse shops public read" ON public.concourse_shops FOR SELECT USING (is_active = true OR public.is_admin_profile());
CREATE POLICY "Admin manages concourse shops" ON public.concourse_shops FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Concourse shop products public read" ON public.concourse_shop_products FOR SELECT USING (true);
CREATE POLICY "Admin manages concourse shop products" ON public.concourse_shop_products FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- Community
CREATE POLICY "Venue followers read" ON public.venue_followers FOR SELECT USING (true);
CREATE POLICY "Venue followers insert own" ON public.venue_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Venue followers update own" ON public.venue_followers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Venue followers delete own" ON public.venue_followers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Venue reviews public read" ON public.venue_reviews FOR SELECT USING (true);
CREATE POLICY "Venue reviews insert own" ON public.venue_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Venue reviews update own" ON public.venue_reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Venue posts public read" ON public.venue_posts FOR SELECT USING (true);
CREATE POLICY "Venue posts insert auth" ON public.venue_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Venue posts update own" ON public.venue_posts FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_profile());

CREATE POLICY "Venue announcements public read" ON public.venue_announcements FOR SELECT USING (true);
CREATE POLICY "Admin manages venue announcements" ON public.venue_announcements FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Venue loyalty read own" ON public.venue_loyalty_profiles FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin_profile());
CREATE POLICY "Venue loyalty insert own" ON public.venue_loyalty_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Venue loyalty ledger read own" ON public.venue_loyalty_ledger FOR SELECT
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.venue_loyalty_profiles p
      WHERE p.id = loyalty_profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Venue check ins insert own" ON public.venue_check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Venue check ins read own" ON public.venue_check_ins FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin_profile());

CREATE POLICY "Venue badges public read" ON public.venue_badges FOR SELECT USING (true);
CREATE POLICY "Admin manages venue badges" ON public.venue_badges FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "User venue badges read" ON public.user_venue_badges FOR SELECT USING (true);
CREATE POLICY "User venue badges insert own" ON public.user_venue_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Venue leaderboards public read" ON public.venue_leaderboard_snapshots FOR SELECT USING (true);
CREATE POLICY "Admin manages venue leaderboards" ON public.venue_leaderboard_snapshots FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Venue analytics admin and sponsor" ON public.venue_analytics_daily FOR SELECT
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.venue_sponsorships vs
      WHERE vs.venue_id = venue_analytics_daily.venue_id
        AND vs.is_active = true
        AND public.is_sponsor_org_member(vs.organization_id)
    )
  );
CREATE POLICY "Admin manages venue analytics daily" ON public.venue_analytics_daily FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Campaign metrics sponsor read" ON public.sponsor_campaign_metrics_daily FOR SELECT
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.sponsor_campaigns c
      WHERE c.id = campaign_id AND public.is_sponsor_org_member(c.organization_id)
    )
  );
CREATE POLICY "Admin manages campaign metrics" ON public.sponsor_campaign_metrics_daily FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Ad impressions insert auth" ON public.advertisement_impressions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);
CREATE POLICY "Ad impressions read sponsor" ON public.advertisement_impressions FOR SELECT
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.advertisements a
      JOIN public.sponsor_campaigns c ON c.id = a.campaign_id
      WHERE a.id = advertisement_id AND public.is_sponsor_org_member(c.organization_id)
    )
  );

CREATE POLICY "Ad clicks insert auth" ON public.advertisement_clicks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Ad clicks read sponsor" ON public.advertisement_clicks FOR SELECT
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.advertisements a
      JOIN public.sponsor_campaigns c ON c.id = a.campaign_id
      WHERE a.id = advertisement_id AND public.is_sponsor_org_member(c.organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Seed reference data & flagship venues
-- ---------------------------------------------------------------------------

INSERT INTO public.venue_types (slug, name, icon_key, sort_order) VALUES
  ('arena', 'Arena', 'arena', 1),
  ('theater', 'Theater', 'theater', 2),
  ('comedy-club', 'Comedy Club', 'comedy', 3),
  ('music-hall', 'Music Hall', 'music-hall', 4),
  ('nightclub', 'Nightclub', 'nightclub', 5),
  ('podcast-studio', 'Podcast Studio', 'podcast', 6),
  ('lecture-hall', 'Lecture Hall', 'lecture', 7),
  ('gaming-arena', 'Gaming Arena', 'gaming', 8),
  ('convention-center', 'Convention Center', 'convention', 9),
  ('festival-grounds', 'Festival Grounds', 'festival', 10),
  ('outdoor-amphitheater', 'Outdoor Amphitheater', 'amphitheater', 11)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.billboard_location_types (slug, name, sort_order) VALUES
  ('homepage', 'Homepage Billboard', 1),
  ('concourse', 'Concourse Billboard', 2),
  ('loading', 'Loading Screen', 3),
  ('event-banner', 'Event Banner', 4),
  ('vip-lounge', 'VIP Lounge', 5),
  ('exit', 'Exit Screen', 6),
  ('sponsor-splash', 'Sponsor Splash Page', 7),
  ('interactive', 'Interactive Advertisement', 8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.venue_themes (slug, name, sort_order) VALUES
  ('summer-festival', 'Summer Festival', 1),
  ('halloween', 'Halloween', 2),
  ('winter-wonderland', 'Winter Wonderland', 3),
  ('holiday-concert', 'Holiday Concert Series', 4),
  ('pride-month', 'Pride Month', 5),
  ('comic-convention', 'Comic Convention', 6),
  ('anime-festival', 'Anime Festival', 7),
  ('country-weekend', 'Country Music Weekend', 8),
  ('jazz-festival', 'Jazz Festival', 9),
  ('electronic-month', 'Electronic Music Month', 10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.venues (slug, name, region, state_code, venue_type_id, capacity, description)
SELECT v.slug, v.name, v.region, v.state_code, vt.id, v.capacity, v.description
FROM (VALUES
  ('new-york-city-arena', 'New York City Arena', 'New York City', 'NY', 65000, 'Flagship northeast arena for simultaneous live circuits.'),
  ('buffalo-arena', 'Buffalo Arena', 'Buffalo', 'NY', 19000, 'Western New York virtual arena.'),
  ('albany-arena', 'Albany Arena', 'Albany', 'NY', 17500, 'Capital district performance venue.'),
  ('boston-arena', 'Boston Arena', 'Boston', 'MA', 19500, 'New England hub for tours and festivals.'),
  ('providence-arena', 'Providence Arena', 'Providence', 'RI', 14000, 'Rhode Island live entertainment venue.'),
  ('los-angeles-arena', 'Los Angeles Arena', 'Los Angeles', 'CA', 20000, 'West coast flagship arena.'),
  ('san-diego-arena', 'San Diego Arena', 'San Diego', 'CA', 18000, 'Southern California coastal venue.'),
  ('dallas-arena', 'Dallas Arena', 'Dallas', 'TX', 21000, 'Central US touring stop.'),
  ('miami-arena', 'Miami Arena', 'Miami', 'FL', 20000, 'Latin and electronic showcase venue.'),
  ('seattle-arena', 'Seattle Arena', 'Seattle', 'WA', 18100, 'Pacific northwest arena.'),
  ('las-vegas-arena', 'Las Vegas Arena', 'Las Vegas', 'NV', 20000, 'Residency and festival destination.'),
  ('london-arena', 'London Arena', 'London', NULL, 20000, 'United Kingdom flagship venue.'),
  ('paris-arena', 'Paris Arena', 'Paris', NULL, 15000, 'European music and culture hall.'),
  ('tokyo-arena', 'Tokyo Arena', 'Tokyo', NULL, 15000, 'Asia-Pacific virtual arena.'),
  ('sydney-arena', 'Sydney Arena', 'Sydney', NULL, 21000, 'Oceania touring centerpiece.')
) AS v(slug, name, region, state_code, capacity, description)
JOIN public.venue_types vt ON vt.slug = 'arena'
ON CONFLICT (slug) DO NOTHING;

-- Default concourse + homepage billboards per seeded venue
INSERT INTO public.venue_billboards (venue_id, location_type_id, slug, label, zone_key)
SELECT ven.id, blt.id, 'homepage-hero', 'Homepage Hero Billboard', 'homepage'
FROM public.venues ven
CROSS JOIN public.billboard_location_types blt
WHERE blt.slug = 'homepage'
ON CONFLICT (venue_id, slug) DO NOTHING;

INSERT INTO public.venue_billboards (venue_id, location_type_id, slug, label, zone_key)
SELECT ven.id, blt.id, 'concourse-main', 'Main Concourse Billboard', 'concourse'
FROM public.venues ven
CROSS JOIN public.billboard_location_types blt
WHERE blt.slug = 'concourse'
ON CONFLICT (venue_id, slug) DO NOTHING;

-- Founding sponsor badge placeholder (venue_badges template)
INSERT INTO public.venue_badges (venue_id, slug, name, description)
SELECT id, 'founding-sponsor-legacy', 'Founding Sponsor Legacy', 'Permanent recognition for the first naming sponsor of this venue.'
FROM public.venues
ON CONFLICT (venue_id, slug) DO NOTHING;
