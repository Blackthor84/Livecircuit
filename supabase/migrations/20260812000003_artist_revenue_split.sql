-- Phase 3: order financial breakdown, artist balances, payout ledger prep

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artist_payout_status') THEN
    CREATE TYPE public.artist_payout_status AS ENUM (
      'pending',
      'available',
      'paid',
      'refunded',
      'partially_refunded',
      'failed',
      'held'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artist_payout_record_status') THEN
    CREATE TYPE public.artist_payout_record_status AS ENUM (
      'pending',
      'available',
      'processing',
      'paid',
      'failed',
      'cancelled',
      'refunded'
    );
  END IF;
END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS gross_cents integer,
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS artist_earnings_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_fee_cents integer,
  ADD COLUMN IF NOT EXISTS refund_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS artist_payout_status public.artist_payout_status NOT NULL DEFAULT 'pending';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_financial_nonneg_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_financial_nonneg_check CHECK (
    COALESCE(gross_cents, 0) >= 0
    AND platform_fee_cents >= 0
    AND artist_earnings_cents >= 0
    AND refund_cents >= 0
    AND (stripe_fee_cents IS NULL OR stripe_fee_cents >= 0)
  );

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_ticket_split_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_ticket_split_check CHECK (
    gross_cents IS NULL
    OR gross_cents = platform_fee_cents + artist_earnings_cents
  );

CREATE TABLE IF NOT EXISTS public.artist_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL UNIQUE REFERENCES public.artists(id) ON DELETE CASCADE,
  pending_cents integer NOT NULL DEFAULT 0 CHECK (pending_cents >= 0),
  available_cents integer NOT NULL DEFAULT 0 CHECK (available_cents >= 0),
  lifetime_gross_cents integer NOT NULL DEFAULT 0 CHECK (lifetime_gross_cents >= 0),
  lifetime_platform_fee_cents integer NOT NULL DEFAULT 0 CHECK (lifetime_platform_fee_cents >= 0),
  lifetime_artist_earnings_cents integer NOT NULL DEFAULT 0 CHECK (lifetime_artist_earnings_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.artist_balance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('ticket_sale', 'refund', 'adjustment')),
  pending_delta_cents integer NOT NULL DEFAULT 0,
  available_delta_cents integer NOT NULL DEFAULT 0,
  gross_cents integer NOT NULL DEFAULT 0 CHECK (gross_cents >= 0),
  platform_fee_cents integer NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  artist_earnings_cents integer NOT NULL DEFAULT 0 CHECK (artist_earnings_cents >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, transaction_type)
);

CREATE INDEX IF NOT EXISTS idx_artist_balance_transactions_artist
  ON public.artist_balance_transactions (artist_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.artist_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  status public.artist_payout_record_status NOT NULL DEFAULT 'pending',
  available_at timestamptz,
  initiated_at timestamptz,
  completed_at timestamptz,
  stripe_transfer_id text,
  stripe_payout_id text,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artist_payouts_artist ON public.artist_payouts (artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_payouts_status ON public.artist_payouts (status);
CREATE INDEX IF NOT EXISTS idx_artist_payouts_available_at ON public.artist_payouts (available_at);

ALTER TABLE public.artist_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artist_balances_owner_read" ON public.artist_balances;
CREATE POLICY "artist_balances_owner_read" ON public.artist_balances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS "artist_balance_transactions_owner_read" ON public.artist_balance_transactions;
CREATE POLICY "artist_balance_transactions_owner_read" ON public.artist_balance_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS "artist_payouts_owner_read" ON public.artist_payouts;
CREATE POLICY "artist_payouts_owner_read" ON public.artist_payouts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
    OR public.is_admin_user()
  );

CREATE OR REPLACE FUNCTION public.credit_artist_ticket_sale(
  p_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.order_type <> 'ticket' OR COALESCE(v_order.artist_earnings_cents, 0) <= 0 THEN
    RETURN;
  END IF;

  IF v_order.artist_id IS NULL THEN
    RAISE EXCEPTION 'Order has no artist';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.artist_balance_transactions
    WHERE order_id = p_order_id AND transaction_type = 'ticket_sale'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.artist_balances (artist_id)
  VALUES (v_order.artist_id)
  ON CONFLICT (artist_id) DO NOTHING;

  UPDATE public.artist_balances
  SET
    pending_cents = pending_cents + v_order.artist_earnings_cents,
    lifetime_gross_cents = lifetime_gross_cents + COALESCE(v_order.gross_cents, v_order.total_cents),
    lifetime_platform_fee_cents = lifetime_platform_fee_cents + v_order.platform_fee_cents,
    lifetime_artist_earnings_cents = lifetime_artist_earnings_cents + v_order.artist_earnings_cents,
    updated_at = now()
  WHERE artist_id = v_order.artist_id;

  INSERT INTO public.artist_balance_transactions (
    artist_id,
    order_id,
    transaction_type,
    pending_delta_cents,
    gross_cents,
    platform_fee_cents,
    artist_earnings_cents
  ) VALUES (
    v_order.artist_id,
    v_order.id,
    'ticket_sale',
    v_order.artist_earnings_cents,
    COALESCE(v_order.gross_cents, v_order.total_cents),
    v_order.platform_fee_cents,
    v_order.artist_earnings_cents
  );

  UPDATE public.orders
  SET artist_payout_status = 'pending'
  WHERE id = p_order_id
    AND artist_payout_status IS DISTINCT FROM 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_artist_ticket_sale(
  p_order_id uuid,
  p_refund_cents integer,
  p_full_refund boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_gross integer;
  v_artist_reversal integer;
  v_platform_reversal integer;
  v_existing public.artist_balance_transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.artist_id IS NULL OR COALESCE(v_order.artist_earnings_cents, 0) <= 0 THEN
    RETURN;
  END IF;

  SELECT * INTO v_existing
  FROM public.artist_balance_transactions
  WHERE order_id = p_order_id AND transaction_type = 'ticket_sale';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.artist_balance_transactions
    WHERE order_id = p_order_id AND transaction_type = 'refund'
  ) THEN
    RETURN;
  END IF;

  v_gross := COALESCE(v_order.gross_cents, v_order.total_cents);
  IF p_full_refund OR p_refund_cents >= v_gross THEN
    v_artist_reversal := v_order.artist_earnings_cents;
    v_platform_reversal := v_order.platform_fee_cents;
  ELSE
    v_artist_reversal := round((v_order.artist_earnings_cents::numeric * p_refund_cents) / NULLIF(v_gross, 0));
    v_platform_reversal := round((v_order.platform_fee_cents::numeric * p_refund_cents) / NULLIF(v_gross, 0));
  END IF;

  UPDATE public.artist_balances
  SET
    pending_cents = GREATEST(0, pending_cents - v_artist_reversal),
    lifetime_gross_cents = GREATEST(0, lifetime_gross_cents - LEAST(v_gross, p_refund_cents)),
    lifetime_platform_fee_cents = GREATEST(0, lifetime_platform_fee_cents - v_platform_reversal),
    lifetime_artist_earnings_cents = GREATEST(0, lifetime_artist_earnings_cents - v_artist_reversal),
    updated_at = now()
  WHERE artist_id = v_order.artist_id;

  INSERT INTO public.artist_balance_transactions (
    artist_id,
    order_id,
    transaction_type,
    pending_delta_cents,
    gross_cents,
    platform_fee_cents,
    artist_earnings_cents,
    metadata
  ) VALUES (
    v_order.artist_id,
    v_order.id,
    'refund',
    -v_artist_reversal,
    LEAST(v_gross, p_refund_cents),
    v_platform_reversal,
    v_artist_reversal,
    jsonb_build_object('full_refund', p_full_refund)
  );

  UPDATE public.orders
  SET
    refund_cents = v_order.refund_cents + p_refund_cents,
    artist_payout_status = CASE
      WHEN p_full_refund OR (v_order.refund_cents + p_refund_cents) >= v_gross THEN 'refunded'::public.artist_payout_status
      ELSE 'partially_refunded'::public.artist_payout_status
    END
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_artist_ticket_sale(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_artist_ticket_sale(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.reverse_artist_ticket_sale(uuid, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reverse_artist_ticket_sale(uuid, integer, boolean) TO service_role;
