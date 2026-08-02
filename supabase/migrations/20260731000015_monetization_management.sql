-- LiveCircuit Monetization Management — full admin-configurable pricing

CREATE TYPE monetization_visibility AS ENUM (
  'enabled', 'disabled', 'hidden', 'coming_soon', 'beta_only', 'agency_only', 'admin_only'
);

-- ─── Venue tier pricing ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_venue_tiers (
  tier_id text PRIMARY KEY,
  name text NOT NULL,
  booking_fee_cents integer NOT NULL DEFAULT 0,
  min_booking_fee_cents integer,
  max_booking_fee_cents integer,
  is_active boolean NOT NULL DEFAULT true,
  visibility monetization_visibility NOT NULL DEFAULT 'enabled',
  early_bird_discount_percent numeric(6,2) NOT NULL DEFAULT 0,
  bulk_booking_discount_percent numeric(6,2) NOT NULL DEFAULT 0,
  agency_discount_percent numeric(6,2) NOT NULL DEFAULT 0,
  weekend_multiplier numeric(6,3) NOT NULL DEFAULT 1,
  peak_hour_multiplier numeric(6,3) NOT NULL DEFAULT 1,
  holiday_multiplier numeric(6,3) NOT NULL DEFAULT 1,
  promo_booking_fee_cents integer,
  promo_starts_at timestamptz,
  promo_ends_at timestamptz,
  effective_at timestamptz NOT NULL DEFAULT now(),
  scheduled_fee_cents integer,
  scheduled_effective_at timestamptz,
  requires_approval boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- ─── Ticketing (singleton) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_ticket_config (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  platform_fee_percent numeric(6,2) NOT NULL DEFAULT 10,
  flat_ticket_fee_cents integer NOT NULL DEFAULT 0,
  min_platform_fee_cents integer NOT NULL DEFAULT 0,
  max_platform_fee_cents integer,
  vip_fee_percent numeric(6,2) NOT NULL DEFAULT 0,
  replay_fee_percent numeric(6,2) NOT NULL DEFAULT 0,
  festival_pass_fee_percent numeric(6,2) NOT NULL DEFAULT 0,
  service_fee_percent numeric(6,2) NOT NULL DEFAULT 0,
  refund_fee_cents integer NOT NULL DEFAULT 0,
  chargeback_fee_cents integer NOT NULL DEFAULT 0,
  late_cancellation_fee_cents integer NOT NULL DEFAULT 0,
  payment_processing_rate_percent numeric(6,2) NOT NULL DEFAULT 2.9,
  payment_processing_fixed_cents integer NOT NULL DEFAULT 30,
  stripe_connect_enabled boolean NOT NULL DEFAULT false,
  visibility monetization_visibility NOT NULL DEFAULT 'enabled',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- ─── Agency plans ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_agency_plans (
  plan_id text PRIMARY KEY,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  price_cents integer NOT NULL,
  annual_price_cents integer,
  monthly_discount_percent numeric(6,2) NOT NULL DEFAULT 0,
  annual_discount_percent numeric(6,2) NOT NULL DEFAULT 0,
  promo_price_cents integer,
  promo_starts_at timestamptz,
  promo_ends_at timestamptz,
  trial_days integer NOT NULL DEFAULT 0,
  artist_limit integer,
  staff_limit integer,
  included_users integer,
  promotional_credits_cents integer NOT NULL DEFAULT 0,
  included_venue_tiers text[] NOT NULL DEFAULT '{}',
  support_level text NOT NULL DEFAULT 'standard',
  feature_toggles jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_enterprise boolean NOT NULL DEFAULT false,
  visibility monetization_visibility NOT NULL DEFAULT 'enabled',
  is_popular boolean NOT NULL DEFAULT false,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  effective_at timestamptz NOT NULL DEFAULT now(),
  scheduled_price_cents integer,
  scheduled_effective_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- ─── Marketing credits per plan ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_marketing_credits (
  plan_id text PRIMARY KEY REFERENCES monetization_agency_plans(plan_id) ON DELETE CASCADE,
  included_credits_cents integer NOT NULL DEFAULT 0,
  expiration_days integer,
  rollover_enabled boolean NOT NULL DEFAULT false,
  additional_credit_price_cents integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Promotion products ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_promotion_products (
  slug text PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  visibility monetization_visibility NOT NULL DEFAULT 'enabled',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Coupons & discounts ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL,
  applies_to text NOT NULL CHECK (applies_to IN ('venue', 'agency', 'festival', 'referral', 'launch', 'seasonal', 'general')),
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  visibility monetization_visibility NOT NULL DEFAULT 'enabled',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- ─── Tax & fees (singleton) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_tax_config (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  sales_tax_percent numeric(6,2) NOT NULL DEFAULT 0,
  vat_percent numeric(6,2) NOT NULL DEFAULT 0,
  gst_percent numeric(6,2) NOT NULL DEFAULT 0,
  processing_fee_display text NOT NULL DEFAULT 'separate',
  platform_fee_display text NOT NULL DEFAULT 'itemized',
  regional_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- ─── Payout settings (singleton) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_payout_config (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  payout_delay_days integer NOT NULL DEFAULT 3,
  min_payout_cents integer NOT NULL DEFAULT 1000,
  max_payout_cents integer,
  reserve_percent numeric(6,2) NOT NULL DEFAULT 0,
  manual_review_threshold_cents integer NOT NULL DEFAULT 100000,
  stripe_connect_ready boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- ─── Feature flags ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_feature_flags (
  flag_key text PRIMARY KEY,
  label text NOT NULL,
  visibility monetization_visibility NOT NULL DEFAULT 'enabled',
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Pricing history (audit) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_pricing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  entity_key text NOT NULL,
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  rolled_back boolean NOT NULL DEFAULT false
);

-- ─── Scheduled future pricing ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_scheduled_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  entity_key text NOT NULL,
  changes jsonb NOT NULL,
  effective_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'cancelled')),
  preview_snapshot jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Seed venue tiers ───────────────────────────────────────────────────────

INSERT INTO monetization_venue_tiers (tier_id, name, booking_fee_cents, sort_order, requires_approval) VALUES
  ('community', 'Community Venue', 2500, 1, false),
  ('club', 'Club Venue', 7500, 2, false),
  ('theater', 'Theater', 20000, 3, false),
  ('arena', 'Arena', 50000, 4, false),
  ('stadium', 'Stadium', 0, 5, true)
ON CONFLICT (tier_id) DO NOTHING;

INSERT INTO monetization_ticket_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

INSERT INTO monetization_agency_plans (plan_id, name, tagline, price_cents, artist_limit, staff_limit, promotional_credits_cents, included_venue_tiers, is_popular, sort_order, features, highlights) VALUES
  ('boutique', 'Boutique', 'For focused rosters ready to scale digitally', 14900, 10, 5, 10000, ARRAY['community','club'], false, 1,
   '["Up to 10 artists","Unlimited Community & Club venues","Booking CRM","$100/mo promotional credits"]'::jsonb,
   '["Unlimited Community & Club venues included","Full Booking CRM","$100/mo promotional credits"]'::jsonb),
  ('growth', 'Growth', 'For agencies scaling revenue across markets', 39900, 50, null, 30000, ARRAY['community','club','theater'], true, 2,
   '["Up to 50 artists","Theater venues included","Advanced analytics","$300/mo promotional credits"]'::jsonb,
   '["Theater venues included","Advanced AI marketing","$300/mo promotional credits"]'::jsonb),
  ('enterprise', 'Enterprise', 'For large rosters and custom operations', 99900, null, null, 80000, ARRAY['community','club','theater','arena'], false, 3,
   '["Unlimited artists","Arena venues included","Dedicated account manager","$800/mo promotional credits"]'::jsonb,
   '["Arena venues included","White-label portal","$800/mo promotional credits"]'::jsonb)
ON CONFLICT (plan_id) DO NOTHING;

INSERT INTO monetization_marketing_credits (plan_id, included_credits_cents, expiration_days, rollover_enabled, additional_credit_price_cents) VALUES
  ('boutique', 10000, 30, false, 100),
  ('growth', 30000, 30, true, 100),
  ('enterprise', 80000, 60, true, 100)
ON CONFLICT (plan_id) DO NOTHING;

INSERT INTO monetization_promotion_products (slug, name, price_cents, sort_order) VALUES
  ('homepage-feature', 'Homepage Feature', 35000, 1),
  ('homepage-hero', 'Homepage Hero', 65000, 2),
  ('featured-artist', 'Featured Artist', 27500, 3),
  ('featured-event', 'Featured Event', 27500, 4),
  ('genre-spotlight', 'Genre Spotlight', 20000, 5),
  ('trending-boost', 'Trending Boost', 22500, 6),
  ('search-boost', 'Search Boost', 20000, 7),
  ('push-notification', 'Push Notification', 22500, 8),
  ('email-campaign', 'Email Campaign', 27500, 9),
  ('agency-spotlight', 'Agency Spotlight', 30000, 10),
  ('newsletter-placement', 'Newsletter Placement', 25000, 11),
  ('festival-promotion', 'Festival Promotion', 40000, 12)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO monetization_tax_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
INSERT INTO monetization_payout_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE monetization_venue_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_ticket_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_agency_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_marketing_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_tax_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_payout_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_scheduled_pricing ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin_user() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Public read for pricing display (authenticated)
DO $$ BEGIN
  CREATE POLICY "auth_read_venue_tiers" ON monetization_venue_tiers FOR SELECT TO authenticated USING (true);
  CREATE POLICY "auth_read_ticket_config" ON monetization_ticket_config FOR SELECT TO authenticated USING (true);
  CREATE POLICY "auth_read_agency_plans" ON monetization_agency_plans FOR SELECT TO authenticated USING (true);
  CREATE POLICY "auth_read_marketing_credits" ON monetization_marketing_credits FOR SELECT TO authenticated USING (true);
  CREATE POLICY "auth_read_promotion_products" ON monetization_promotion_products FOR SELECT TO authenticated USING (true);
  CREATE POLICY "auth_read_tax_config" ON monetization_tax_config FOR SELECT TO authenticated USING (true);
  CREATE POLICY "auth_read_payout_config" ON monetization_payout_config FOR SELECT TO authenticated USING (true);
  CREATE POLICY "auth_read_feature_flags" ON monetization_feature_flags FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin write
DO $$ BEGIN
  CREATE POLICY "admin_all_venue_tiers" ON monetization_venue_tiers FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY "admin_all_ticket_config" ON monetization_ticket_config FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY "admin_all_agency_plans" ON monetization_agency_plans FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY "admin_all_marketing_credits" ON monetization_marketing_credits FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY "admin_all_promotion_products" ON monetization_promotion_products FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY "admin_all_coupons" ON monetization_coupons FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY "admin_all_tax_config" ON monetization_tax_config FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY "admin_all_payout_config" ON monetization_payout_config FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY "admin_all_feature_flags" ON monetization_feature_flags FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY "admin_all_pricing_history" ON monetization_pricing_history FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY "admin_all_scheduled_pricing" ON monetization_scheduled_pricing FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY "auth_read_coupons" ON monetization_coupons FOR SELECT TO authenticated USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON monetization_venue_tiers, monetization_ticket_config, monetization_agency_plans,
  monetization_marketing_credits, monetization_promotion_products, monetization_coupons,
  monetization_tax_config, monetization_payout_config, monetization_feature_flags,
  monetization_pricing_history, monetization_scheduled_pricing TO authenticated;

-- Migrate legacy platform_pricing_config if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_pricing_config') THEN
    UPDATE monetization_ticket_config t SET
      platform_fee_percent = COALESCE(p.platform_fee_percent, t.platform_fee_percent),
      payment_processing_rate_percent = COALESCE(p.payment_processing_rate_percent, t.payment_processing_rate_percent),
      payment_processing_fixed_cents = COALESCE(p.payment_processing_fixed_cents, t.payment_processing_fixed_cents),
      updated_at = COALESCE(p.updated_at, t.updated_at)
    FROM platform_pricing_config p WHERE p.id = 'default' AND t.id = 'default';

    UPDATE monetization_venue_tiers v SET booking_fee_cents = (p.booking_fees->>v.tier_id)::integer * 100
    FROM platform_pricing_config p
    WHERE p.id = 'default' AND p.booking_fees ? v.tier_id AND v.tier_id != 'stadium';

    UPDATE monetization_venue_tiers SET requires_approval = true WHERE tier_id = 'stadium';
  END IF;
END $$;
