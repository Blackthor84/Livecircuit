-- LiveCircuit Feature & Pricing Rules Engine

CREATE TYPE business_rule_category AS ENUM (
  'venue',
  'pricing',
  'subscription',
  'agency',
  'artist',
  'sponsor',
  'discount',
  'promotion',
  'ticket',
  'feature_access',
  'automation',
  'holiday',
  'regional',
  'experimental'
);

CREATE TYPE business_rule_status AS ENUM ('active', 'inactive', 'draft', 'archived');

CREATE TABLE IF NOT EXISTS business_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category business_rule_category NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  status business_rule_status NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  target_audience jsonb NOT NULL DEFAULT '[]'::jsonb,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_notes text,
  version integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS business_rules_category_idx ON business_rules (category);
CREATE INDEX IF NOT EXISTS business_rules_status_priority_idx ON business_rules (status, priority DESC);

CREATE TABLE IF NOT EXISTS business_rules_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES business_rules(id) ON DELETE SET NULL,
  previous_rule jsonb,
  updated_rule jsonb NOT NULL,
  reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  rolled_back boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS business_rules_history_rule_idx ON business_rules_history (rule_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS business_rules_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starts_at date NOT NULL,
  ends_at date NOT NULL,
  regions text[] NOT NULL DEFAULT '{}',
  surcharge_percent numeric(6,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Seed default business rules ────────────────────────────────────────────

INSERT INTO business_rules (name, description, category, priority, status, target_audience, conditions, actions, admin_notes)
VALUES
  (
    'Boutique — Unlimited Community Bookings',
    'Boutique agencies receive unlimited free Community venue bookings.',
    'agency', 900, 'active', '["agency"]'::jsonb,
    '[{"type":"user_type","operator":"equals","value":"agency"},{"type":"agency_plan","operator":"equals","value":"boutique"},{"type":"venue_type","operator":"equals","value":"community"}]'::jsonb,
    '[{"type":"free_venue_booking"}]'::jsonb,
    'Core Boutique partnership benefit'
  ),
  (
    'Boutique — Unlimited Club Bookings',
    'Boutique agencies receive unlimited free Club venue bookings.',
    'agency', 890, 'active', '["agency"]'::jsonb,
    '[{"type":"user_type","operator":"equals","value":"agency"},{"type":"agency_plan","operator":"equals","value":"boutique"},{"type":"venue_type","operator":"equals","value":"club"}]'::jsonb,
    '[{"type":"free_venue_booking"}]'::jsonb,
    'Core Boutique partnership benefit'
  ),
  (
    'Growth — Unlimited Theater Bookings',
    'Growth agencies receive unlimited free Theater venue bookings.',
    'agency', 880, 'active', '["agency"]'::jsonb,
    '[{"type":"user_type","operator":"equals","value":"agency"},{"type":"agency_plan","operator":"equals","value":"growth"},{"type":"venue_type","operator":"equals","value":"theater"}]'::jsonb,
    '[{"type":"free_venue_booking"}]'::jsonb,
    'Core Growth partnership benefit'
  ),
  (
    'Enterprise — Unlimited Arena Bookings',
    'Enterprise agencies receive unlimited free Arena venue bookings.',
    'agency', 870, 'active', '["agency"]'::jsonb,
    '[{"type":"user_type","operator":"equals","value":"agency"},{"type":"agency_plan","operator":"equals","value":"enterprise"},{"type":"venue_type","operator":"equals","value":"arena"}]'::jsonb,
    '[{"type":"free_venue_booking"}]'::jsonb,
    'Core Enterprise partnership benefit'
  ),
  (
    'New Artist — First Booking Free',
    'Artists with zero prior bookings receive their first venue booking free.',
    'artist', 850, 'active', '["artist"]'::jsonb,
    '[{"type":"user_type","operator":"equals","value":"artist"},{"type":"artist_status","operator":"equals","value":"new"},{"type":"event_count","operator":"equals","value":0}]'::jsonb,
    '[{"type":"free_venue_booking"}]'::jsonb,
    'Onboarding incentive for new artists'
  ),
  (
    'Verified Nonprofit — 50% Booking Discount',
    'Verified nonprofit organizations receive 50% off venue booking fees.',
    'discount', 800, 'active', '["artist","agency"]'::jsonb,
    '[{"type":"custom_tags","operator":"contains","value":"nonprofit_verified"}]'::jsonb,
    '[{"type":"venue_discount","value":50,"unit":"percent"}]'::jsonb,
    'Requires nonprofit_verified custom tag'
  ),
  (
    'Holiday Weekend — 20% Venue Surcharge',
    'Holiday weekends apply a 20% surcharge to venue booking fees.',
    'holiday', 750, 'active', '["artist","agency"]'::jsonb,
    '[{"type":"holiday","operator":"equals","value":true},{"type":"day_of_week","operator":"in","value":["saturday","sunday"]}]'::jsonb,
    '[{"type":"venue_surcharge","value":20,"unit":"percent"}]'::jsonb,
    'Auto-activates on configured holidays'
  ),
  (
    'Weekend Pricing — Standard Multiplier',
    'Weekend bookings apply configured weekend pricing multiplier from venue tiers.',
    'pricing', 700, 'active', '["artist","agency"]'::jsonb,
    '[{"type":"day_of_week","operator":"in","value":["saturday","sunday"]}]'::jsonb,
    '[{"type":"apply_weekend_multiplier"}]'::jsonb,
    'Uses monetization venue tier weekend_multiplier'
  ),
  (
    'Featured Artist — Homepage Priority',
    'Top performers receive priority homepage placement.',
    'promotion', 650, 'active', '["artist"]'::jsonb,
    '[{"type":"artist_status","operator":"equals","value":"top_performer"}]'::jsonb,
    '[{"type":"homepage_feature"},{"type":"priority_scheduling"}]'::jsonb,
    'Marketing benefit for featured artists'
  ),
  (
    'Beta Users — Early Access',
    'Beta users unlock experimental features.',
    'experimental', 600, 'active', '["artist","agency","fan"]'::jsonb,
    '[{"type":"custom_tags","operator":"contains","value":"beta_user"}]'::jsonb,
    '[{"type":"enable_beta_features"},{"type":"feature_unlock","value":"beta_labs"}]'::jsonb,
    'Controlled rollout for beta testers'
  ),
  (
    'Stadium — Manual Review Required',
    'All Stadium venue bookings require manual admin review.',
    'venue', 950, 'active', '["artist","agency"]'::jsonb,
    '[{"type":"venue_type","operator":"equals","value":"stadium"}]'::jsonb,
    '[{"type":"require_manual_review"}]'::jsonb,
    'Safety gate for flagship venues'
  )
ON CONFLICT DO NOTHING;

INSERT INTO business_rules_holidays (name, starts_at, ends_at, regions, surcharge_percent)
VALUES
  ('New Year''s Weekend', '2026-12-31', '2027-01-02', '{}', 20),
  ('Memorial Day Weekend', '2026-05-22', '2026-05-25', '{}', 20),
  ('Independence Day Weekend', '2026-07-03', '2026-07-05', '{}', 20),
  ('Labor Day Weekend', '2026-09-04', '2026-09-07', '{}', 20),
  ('Thanksgiving Weekend', '2026-11-26', '2026-11-29', '{}', 20)
ON CONFLICT DO NOTHING;

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_rules_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_rules_holidays ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY business_rules_read ON business_rules FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY business_rules_admin_write ON business_rules FOR ALL TO authenticated
    USING (is_admin_user()) WITH CHECK (is_admin_user());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY business_rules_history_read ON business_rules_history FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY business_rules_history_admin_write ON business_rules_history FOR ALL TO authenticated
    USING (is_admin_user()) WITH CHECK (is_admin_user());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY business_rules_holidays_read ON business_rules_holidays FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY business_rules_holidays_admin_write ON business_rules_holidays FOR ALL TO authenticated
    USING (is_admin_user()) WITH CHECK (is_admin_user());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON business_rules TO authenticated;
GRANT SELECT ON business_rules_history TO authenticated;
GRANT SELECT ON business_rules_holidays TO authenticated;
