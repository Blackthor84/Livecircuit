-- Financial ledger, payment records, coupon redemptions, Stripe webhook audit

CREATE TABLE IF NOT EXISTS monetization_financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL CHECK (entry_type IN (
    'payment', 'refund', 'dispute', 'chargeback', 'fee', 'credit', 'payout', 'adjustment'
  )),
  direction text NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_event_id text,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  category text NOT NULL DEFAULT 'general',
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_order ON monetization_financial_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_user ON monetization_financial_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_stripe_event ON monetization_financial_ledger(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_created ON monetization_financial_ledger(created_at DESC);

CREATE TABLE IF NOT EXISTS monetization_payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  purchase_type text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN (
    'pending', 'completed', 'failed', 'refunded', 'disputed', 'partially_refunded'
  )),
  subtotal_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  coupon_id uuid REFERENCES monetization_coupons(id) ON DELETE SET NULL,
  coupon_code text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_event_id text,
  receipt_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_records_session
  ON monetization_payment_records(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_records_user ON monetization_payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_order ON monetization_payment_records(order_id);

CREATE TABLE IF NOT EXISTS monetization_coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES monetization_coupons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  payment_record_id uuid REFERENCES monetization_payment_records(id) ON DELETE SET NULL,
  discount_cents integer NOT NULL DEFAULT 0,
  campaign text,
  referral_source text,
  promotion text,
  stripe_event_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_redemption_order
  ON monetization_coupon_redemptions(order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON monetization_coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON monetization_coupon_redemptions(user_id);

CREATE TABLE IF NOT EXISTS monetization_stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'duplicate', 'ignored')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_type ON monetization_stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_status ON monetization_stripe_webhook_events(status);

ALTER TABLE monetization_admin_notifications
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
  ON monetization_admin_notifications(is_read, is_archived, created_at DESC);

-- RLS
ALTER TABLE monetization_financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY admin_all_financial_ledger ON monetization_financial_ledger
    FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY admin_all_payment_records ON monetization_payment_records
    FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY admin_all_coupon_redemptions ON monetization_coupon_redemptions
    FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY admin_all_stripe_webhooks ON monetization_stripe_webhook_events
    FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
  CREATE POLICY user_read_own_payments ON monetization_payment_records
    FOR SELECT TO authenticated USING (user_id = auth.uid());
  CREATE POLICY admin_read_notifications ON monetization_admin_notifications
    FOR SELECT TO authenticated USING (is_admin_user());
  CREATE POLICY admin_update_notifications ON monetization_admin_notifications
    FOR UPDATE TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
