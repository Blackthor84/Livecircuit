-- Complete monetization infrastructure: sponsor/founder pricing, feature flags, coupons, notifications

-- ─── Extend feature flags ───────────────────────────────────────────────────

ALTER TABLE monetization_feature_flags
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rollout_percent integer NOT NULL DEFAULT 100 CHECK (rollout_percent >= 0 AND rollout_percent <= 100),
  ADD COLUMN IF NOT EXISTS rollout_regions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rollout_roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

CREATE TABLE IF NOT EXISTS monetization_feature_flag_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL,
  previous_value jsonb,
  new_value jsonb NOT NULL,
  reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Extend coupons ─────────────────────────────────────────────────────────

ALTER TABLE monetization_coupons
  ADD COLUMN IF NOT EXISTS effect_type text NOT NULL DEFAULT 'percent'
    CHECK (effect_type IN ('percent','fixed','free_venue','free_ticket_fee','free_credits','free_trial','bogo')),
  ADD COLUMN IF NOT EXISTS min_purchase_cents integer,
  ADD COLUMN IF NOT EXISTS max_discount_cents integer,
  ADD COLUMN IF NOT EXISTS per_user_limit integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS user_restrictions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ─── Sponsor pricing tiers ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_sponsor_tiers (
  tier_id text PRIMARY KEY,
  name text NOT NULL,
  annual_price_cents integer NOT NULL,
  monthly_price_cents integer NOT NULL,
  regular_annual_price_cents integer NOT NULL,
  setup_fee_cents integer NOT NULL DEFAULT 0,
  future_growth_price_cents integer,
  future_enterprise_label text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  visibility monetization_visibility NOT NULL DEFAULT 'enabled',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monetization_sponsor_addons (
  slug text PRIMARY KEY,
  name text NOT NULL,
  monthly_price_cents integer NOT NULL DEFAULT 0,
  annual_price_cents integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monetization_sponsor_contract_options (
  id text PRIMARY KEY,
  years integer NOT NULL,
  discount_percent numeric(6,2) NOT NULL DEFAULT 0,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

-- ─── Founder pricing ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_founder_program (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  badge text NOT NULL DEFAULT 'FOUNDER PROGRAM',
  headline text NOT NULL,
  subheadline text NOT NULL,
  section_title text NOT NULL DEFAULT 'Founder Sponsor Pricing',
  timer_title text NOT NULL DEFAULT 'Founder Program',
  timer_subtitle text NOT NULL DEFAULT 'Limited Availability',
  timer_message text NOT NULL,
  legal_note text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monetization_founder_pricing (
  tier_id text PRIMARY KEY REFERENCES monetization_sponsor_tiers(tier_id),
  founder_annual_cents integer NOT NULL,
  founder_monthly_cents integer NOT NULL,
  regular_annual_cents integer NOT NULL,
  invite_only boolean NOT NULL DEFAULT false,
  lifetime_pricing boolean NOT NULL DEFAULT false,
  custom_group text,
  expires_at timestamptz,
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Admin notifications ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','success')),
  entity_key text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Seed sponsor tiers (from FOUNDER_SPONSOR_PRICING) ──────────────────────

INSERT INTO monetization_sponsor_tiers (tier_id, name, annual_price_cents, monthly_price_cents, regular_annual_price_cents, setup_fee_cents, future_growth_price_cents, future_enterprise_label, sort_order) VALUES
  ('community', 'Community Arena', 500000, 41700, 1000000, 50000, 1000000, '$25,000+', 1),
  ('club', 'Club Arena', 1250000, 104200, 2500000, 100000, 2500000, '$50,000+', 2),
  ('theater', 'Theater Arena', 2500000, 208300, 5000000, 250000, 5000000, '$100,000+', 3),
  ('arena', 'Arena', 5000000, 416700, 10000000, 500000, 10000000, '$250,000+', 4),
  ('stadium', 'Stadium', 10000000, 833300, 20000000, 1000000, 20000000, '$500,000+', 5)
ON CONFLICT (tier_id) DO NOTHING;

INSERT INTO monetization_founder_pricing (tier_id, founder_annual_cents, founder_monthly_cents, regular_annual_cents) VALUES
  ('community', 500000, 41700, 1000000),
  ('club', 1250000, 104200, 2500000),
  ('theater', 2500000, 208300, 5000000),
  ('arena', 5000000, 416700, 10000000),
  ('stadium', 10000000, 833300, 20000000)
ON CONFLICT (tier_id) DO NOTHING;

INSERT INTO monetization_founder_program (id, headline, subheadline, timer_message, legal_note) VALUES
  ('default',
   'Become One of LiveCircuit''s Founding Sponsors',
   'Early sponsors receive exclusive introductory pricing, priority renewal opportunities, and permanent recognition as founding partners while LiveCircuit grows.',
   'Founder pricing is reserved for a limited number of early sponsors. As LiveCircuit grows and audience reach expands, sponsorship pricing may increase for future partners.',
   'Founder pricing shown is for demonstration purposes. Final sponsorship packages are customized based on market, exclusivity, venue availability, contract length, and promotional opportunities.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO monetization_sponsor_addons (slug, name, monthly_price_cents, annual_price_cents, category, sort_order) VALUES
  ('homepage-feature', 'Homepage Feature', 35000, 350000, 'placement', 1),
  ('homepage-hero', 'Homepage Hero', 65000, 650000, 'placement', 2),
  ('lobby-ads', 'Lobby Ads', 15000, 150000, 'placement', 3),
  ('billboards', 'Billboards', 20000, 200000, 'placement', 4),
  ('video-ads', 'Video Ads', 25000, 250000, 'placement', 5),
  ('waiting-room-ads', 'Waiting Room Ads', 12000, 120000, 'placement', 6),
  ('newsletter-sponsorship', 'Newsletter Sponsorship', 25000, 250000, 'placement', 7),
  ('sponsored-events', 'Sponsored Events', 40000, 400000, 'events', 8),
  ('sponsored-artist', 'Sponsored Artist Placement', 30000, 300000, 'events', 9),
  ('festival-sponsorship', 'Festival Sponsorship', 50000, 500000, 'events', 10),
  ('premium-brand-package', 'Premium Brand Package', 75000, 750000, 'enterprise', 11)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO monetization_sponsor_contract_options (id, years, discount_percent, label, sort_order) VALUES
  ('3yr', 3, 10, '3 Year Contract (−10%)', 1),
  ('5yr', 5, 20, '5 Year Contract (−20%)', 2)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed feature flags ─────────────────────────────────────────────────────

INSERT INTO monetization_feature_flags (flag_key, label, description, visibility, is_enabled) VALUES
  ('ai_poster_generator', 'AI Poster Generator', 'AI-powered event poster generation', 'enabled', true),
  ('festival_builder', 'Festival Builder', 'Multi-stage festival creation tools', 'enabled', true),
  ('marketplace', 'Marketplace', 'Creator marketplace and bookings', 'enabled', true),
  ('sponsor_matching', 'Sponsor Matching', 'AI sponsor matching for artists and agencies', 'enabled', true),
  ('venue_booking', 'Venue Booking', 'Digital venue booking flow', 'enabled', true),
  ('marketing_wallet', 'Marketing Wallet', 'Agency marketing credit wallet', 'agency_only', true),
  ('stripe_connect', 'Stripe Connect', 'Artist/agency payout via Stripe Connect', 'coming_soon', false),
  ('ticket_replay', 'Ticket Replay', 'Paid replay purchases for events', 'enabled', true),
  ('vip_lounge', 'VIP Lounge', 'VIP fan lounge experiences', 'enabled', true),
  ('agency_crm', 'Agency CRM', 'Full agency booking CRM', 'agency_only', true),
  ('artist_verification', 'Artist Verification', 'Verified artist badge program', 'enabled', true),
  ('beta_features', 'Beta Features', 'Experimental beta feature access', 'beta_only', false)
ON CONFLICT (flag_key) DO NOTHING;

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE monetization_feature_flag_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_sponsor_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_sponsor_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_sponsor_contract_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_founder_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_founder_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_admin_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY auth_read_sponsor_tiers ON monetization_sponsor_tiers FOR SELECT TO authenticated USING (true);
  CREATE POLICY auth_read_sponsor_addons ON monetization_sponsor_addons FOR SELECT TO authenticated USING (true);
  CREATE POLICY auth_read_sponsor_contracts ON monetization_sponsor_contract_options FOR SELECT TO authenticated USING (true);
  CREATE POLICY auth_read_founder_program ON monetization_founder_program FOR SELECT TO authenticated USING (true);
  CREATE POLICY auth_read_founder_pricing ON monetization_founder_pricing FOR SELECT TO authenticated USING (true);
  CREATE POLICY admin_all_sponsor_tiers ON monetization_sponsor_tiers FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY admin_all_sponsor_addons ON monetization_sponsor_addons FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY admin_all_sponsor_contracts ON monetization_sponsor_contract_options FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY admin_all_founder_program ON monetization_founder_program FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY admin_all_founder_pricing ON monetization_founder_pricing FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY admin_all_feature_flag_history ON monetization_feature_flag_history FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY admin_all_notifications ON monetization_admin_notifications FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY admin_read_notifications ON monetization_admin_notifications FOR SELECT TO authenticated USING (is_admin_user());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
