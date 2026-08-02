-- Admin-configurable artist-first pricing (venue booking fees + ticket fees)

CREATE TABLE IF NOT EXISTS platform_pricing_config (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  booking_fees jsonb NOT NULL DEFAULT '{"community":25,"club":75,"theater":200,"arena":500}'::jsonb,
  platform_fee_percent numeric(5,2) NOT NULL DEFAULT 10,
  payment_processing_rate_percent numeric(5,2) NOT NULL DEFAULT 2.9,
  payment_processing_fixed_cents integer NOT NULL DEFAULT 30,
  stadium_requires_approval boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO platform_pricing_config (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read platform pricing"
  ON platform_pricing_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins update platform pricing"
  ON platform_pricing_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Public read for checkout/display (no write)
CREATE POLICY "Authenticated users read platform pricing"
  ON platform_pricing_config FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON platform_pricing_config TO authenticated;
GRANT UPDATE ON platform_pricing_config TO authenticated;
