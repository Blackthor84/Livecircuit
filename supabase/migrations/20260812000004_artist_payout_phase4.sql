-- Phase 4: 7-day hold, manual payouts, release, receivables, fee reconciliation

-- Align default hold with 7-day business rule (configurable via admin)
UPDATE public.monetization_payout_config
SET payout_delay_days = 7
WHERE id = 'default' AND payout_delay_days < 7;

ALTER TABLE public.monetization_payout_config
  ALTER COLUMN payout_delay_days SET DEFAULT 7;

ALTER TABLE public.monetization_payout_config
  ALTER COLUMN min_payout_cents SET DEFAULT 2500;

UPDATE public.monetization_payout_config
SET min_payout_cents = GREATEST(min_payout_cents, 2500)
WHERE id = 'default' AND min_payout_cents < 2500;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS available_at timestamptz,
  ADD COLUMN IF NOT EXISTS remaining_artist_earnings_cents integer,
  ADD COLUMN IF NOT EXISTS stripe_balance_transaction_id text,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
  ADD COLUMN IF NOT EXISTS stripe_application_fee_id text,
  ADD COLUMN IF NOT EXISTS artist_receivable_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS stripe_payouts_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_schedule text;

ALTER TABLE public.artist_balances
  ADD COLUMN IF NOT EXISTS receivable_cents integer NOT NULL DEFAULT 0 CHECK (receivable_cents >= 0),
  ADD COLUMN IF NOT EXISTS lifetime_paid_out_cents integer NOT NULL DEFAULT 0 CHECK (lifetime_paid_out_cents >= 0);

ALTER TABLE public.artist_balance_transactions
  DROP CONSTRAINT IF EXISTS artist_balance_transactions_transaction_type_check;

ALTER TABLE public.artist_balance_transactions
  ADD CONSTRAINT artist_balance_transactions_transaction_type_check CHECK (
    transaction_type IN ('ticket_sale', 'refund', 'partial_refund', 'adjustment', 'release', 'payout', 'dispute_hold', 'receivable')
  );

ALTER TABLE public.artist_balance_transactions
  ADD COLUMN IF NOT EXISTS reference_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_balance_tx_reference
  ON public.artist_balance_transactions (reference_id)
  WHERE reference_id IS NOT NULL;

ALTER TABLE public.artist_payouts
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd';

CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_payouts_idempotency
  ON public.artist_payouts (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_payouts_stripe_payout
  ON public.artist_payouts (stripe_payout_id)
  WHERE stripe_payout_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.artist_payout_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.artist_payouts(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payout_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_artist_payout_orders_order
  ON public.artist_payout_orders (order_id);

ALTER TABLE public.artist_payout_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artist_payout_orders_owner_read" ON public.artist_payout_orders;
CREATE POLICY "artist_payout_orders_owner_read" ON public.artist_payout_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artist_payouts p
      JOIN public.artists a ON a.id = p.artist_id
      WHERE p.id = payout_id AND a.user_id = auth.uid()
    )
    OR public.is_admin_user()
  );

CREATE OR REPLACE FUNCTION public.credit_artist_ticket_sale(
  p_order_id uuid,
  p_payment_success_at timestamptz DEFAULT now(),
  p_hold_days integer DEFAULT 7
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_available_at timestamptz;
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

  v_available_at := p_payment_success_at + make_interval(days => p_hold_days);

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
    artist_earnings_cents,
    reference_id
  ) VALUES (
    v_order.artist_id,
    v_order.id,
    'ticket_sale',
    v_order.artist_earnings_cents,
    COALESCE(v_order.gross_cents, v_order.total_cents),
    v_order.platform_fee_cents,
    v_order.artist_earnings_cents,
    'ticket_sale:' || v_order.id::text
  );

  UPDATE public.orders
  SET
    payment_success_at = COALESCE(payment_success_at, p_payment_success_at),
    available_at = COALESCE(available_at, v_available_at),
    remaining_artist_earnings_cents = v_order.artist_earnings_cents,
    artist_payout_status = 'pending'
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_artist_order_earnings(p_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_amount integer;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_order.artist_payout_status NOT IN ('pending', 'partially_refunded') THEN
    RETURN 0;
  END IF;

  IF v_order.available_at IS NULL OR v_order.available_at > now() THEN
    RETURN 0;
  END IF;

  IF v_order.status <> 'paid' THEN RETURN 0; END IF;

  v_amount := COALESCE(v_order.remaining_artist_earnings_cents, v_order.artist_earnings_cents, 0);
  IF v_amount <= 0 THEN RETURN 0; END IF;

  IF EXISTS (
    SELECT 1 FROM public.artist_balance_transactions
    WHERE reference_id = 'release:' || p_order_id::text
  ) THEN
    RETURN 0;
  END IF;

  UPDATE public.artist_balances
  SET
    pending_cents = GREATEST(0, pending_cents - v_amount),
    available_cents = available_cents + v_amount,
    updated_at = now()
  WHERE artist_id = v_order.artist_id;

  INSERT INTO public.artist_balance_transactions (
    artist_id, order_id, transaction_type,
    pending_delta_cents, available_delta_cents,
    gross_cents, platform_fee_cents, artist_earnings_cents,
    reference_id
  ) VALUES (
    v_order.artist_id, v_order.id, 'release',
    -v_amount, v_amount,
    0, 0, v_amount,
    'release:' || p_order_id::text
  );

  UPDATE public.orders
  SET artist_payout_status = 'available'
  WHERE id = p_order_id;

  RETURN v_amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_artist_ticket_sale(
  p_order_id uuid,
  p_refund_cents integer,
  p_full_refund boolean DEFAULT true,
  p_reference_id text DEFAULT NULL
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
  v_from_pending integer;
  v_from_available integer;
  v_to_receivable integer;
  v_ref_key text;
BEGIN
  v_ref_key := COALESCE(p_reference_id, 'refund:' || p_order_id::text || ':' || p_refund_cents::text);

  IF EXISTS (
    SELECT 1 FROM public.artist_balance_transactions WHERE reference_id = v_ref_key
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF v_order.artist_id IS NULL OR COALESCE(v_order.artist_earnings_cents, 0) <= 0 THEN
    RETURN;
  END IF;

  SELECT * INTO v_existing
  FROM public.artist_balance_transactions
  WHERE order_id = p_order_id AND transaction_type = 'ticket_sale';

  IF NOT FOUND THEN RETURN; END IF;

  v_gross := COALESCE(v_order.gross_cents, v_order.total_cents);
  IF p_full_refund OR p_refund_cents >= v_gross THEN
    v_artist_reversal := COALESCE(v_order.remaining_artist_earnings_cents, v_order.artist_earnings_cents);
    v_platform_reversal := v_order.platform_fee_cents;
  ELSE
    v_artist_reversal := round((v_order.artist_earnings_cents::numeric * p_refund_cents) / NULLIF(v_gross, 0));
    v_platform_reversal := round((v_order.platform_fee_cents::numeric * p_refund_cents) / NULLIF(v_gross, 0));
    v_artist_reversal := LEAST(v_artist_reversal, COALESCE(v_order.remaining_artist_earnings_cents, v_order.artist_earnings_cents));
  END IF;

  IF v_artist_reversal <= 0 THEN RETURN; END IF;

  v_from_pending := LEAST(v_artist_reversal, (SELECT pending_cents FROM public.artist_balances WHERE artist_id = v_order.artist_id));
  v_from_available := LEAST(v_artist_reversal - v_from_pending,
    GREATEST(0, (SELECT available_cents FROM public.artist_balances WHERE artist_id = v_order.artist_id)));
  v_to_receivable := GREATEST(0, v_artist_reversal - v_from_pending - v_from_available);

  UPDATE public.artist_balances
  SET
    pending_cents = GREATEST(0, pending_cents - v_from_pending),
    available_cents = GREATEST(0, available_cents - v_from_available),
    receivable_cents = receivable_cents + v_to_receivable,
    lifetime_gross_cents = GREATEST(0, lifetime_gross_cents - LEAST(v_gross, p_refund_cents)),
    lifetime_platform_fee_cents = GREATEST(0, lifetime_platform_fee_cents - v_platform_reversal),
    lifetime_artist_earnings_cents = GREATEST(0, lifetime_artist_earnings_cents - v_artist_reversal),
    updated_at = now()
  WHERE artist_id = v_order.artist_id;

  INSERT INTO public.artist_balance_transactions (
    artist_id, order_id, transaction_type,
    pending_delta_cents, available_delta_cents,
    gross_cents, platform_fee_cents, artist_earnings_cents,
    metadata, reference_id
  ) VALUES (
    v_order.artist_id, v_order.id,
    CASE WHEN p_full_refund OR (v_order.refund_cents + p_refund_cents) >= v_gross THEN 'refund' ELSE 'partial_refund' END,
    -v_from_pending, -v_from_available,
    LEAST(v_gross, p_refund_cents), v_platform_reversal, v_artist_reversal,
    jsonb_build_object(
      'full_refund', p_full_refund,
      'receivable_cents', v_to_receivable
    ),
    v_ref_key
  );

  IF v_to_receivable > 0 THEN
    INSERT INTO public.artist_balance_transactions (
      artist_id, order_id, transaction_type,
      gross_cents, platform_fee_cents, artist_earnings_cents,
      metadata, reference_id
    ) VALUES (
      v_order.artist_id, v_order.id, 'receivable',
      0, 0, v_to_receivable,
      jsonb_build_object('reason', 'refund_after_payout'),
      'receivable:' || v_ref_key
    );
  END IF;

  UPDATE public.orders
  SET
    refund_cents = v_order.refund_cents + p_refund_cents,
    remaining_artist_earnings_cents = GREATEST(0, COALESCE(remaining_artist_earnings_cents, artist_earnings_cents) - v_artist_reversal),
    artist_receivable_cents = artist_receivable_cents + v_to_receivable,
    artist_payout_status = CASE
      WHEN v_order.artist_payout_status = 'held' THEN 'held'::public.artist_payout_status
      WHEN p_full_refund OR (v_order.refund_cents + p_refund_cents) >= v_gross THEN 'refunded'::public.artist_payout_status
      ELSE 'partially_refunded'::public.artist_payout_status
    END
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hold_artist_order_earnings(p_order_id uuid, p_reason text DEFAULT 'dispute')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_order.artist_payout_status IN ('paid', 'refunded', 'held') THEN RETURN; END IF;

  UPDATE public.orders
  SET artist_payout_status = 'held',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('hold_reason', p_reason, 'held_at', now())
  WHERE id = p_order_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.artist_balance_transactions
    WHERE reference_id = 'dispute_hold:' || p_order_id::text
  ) THEN
    INSERT INTO public.artist_balance_transactions (
      artist_id, order_id, transaction_type, reference_id, metadata
    ) VALUES (
      v_order.artist_id, p_order_id, 'dispute_hold', 'dispute_hold:' || p_order_id::text,
      jsonb_build_object('reason', p_reason)
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_artist_payout(
  p_payout_id uuid,
  p_stripe_payout_id text,
  p_success boolean,
  p_failure_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.artist_payouts%ROWTYPE;
BEGIN
  SELECT * INTO v_payout FROM public.artist_payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_payout.status IN ('paid', 'failed', 'cancelled') THEN RETURN; END IF;

  IF p_success THEN
    UPDATE public.artist_payouts
    SET status = 'paid', stripe_payout_id = p_stripe_payout_id,
        completed_at = now(), updated_at = now()
    WHERE id = p_payout_id;

    UPDATE public.artist_balances
    SET
      lifetime_paid_out_cents = lifetime_paid_out_cents + v_payout.amount_cents,
      updated_at = now()
    WHERE artist_id = v_payout.artist_id;

    UPDATE public.orders o
    SET artist_payout_status = 'paid'
    FROM public.artist_payout_orders po
    WHERE po.payout_id = p_payout_id AND po.order_id = o.id
      AND o.artist_payout_status = 'available';

    INSERT INTO public.artist_balance_transactions (
      artist_id, order_id, transaction_type,
      available_delta_cents, artist_earnings_cents, reference_id, metadata
    )
    SELECT v_payout.artist_id, po.order_id, 'payout',
      -po.amount_cents, po.amount_cents,
      'payout:' || p_payout_id::text || ':' || po.order_id::text,
      jsonb_build_object('stripe_payout_id', p_stripe_payout_id)
    FROM public.artist_payout_orders po
    WHERE po.payout_id = p_payout_id
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.artist_payouts
    SET status = 'failed', stripe_payout_id = COALESCE(p_stripe_payout_id, stripe_payout_id),
        failure_reason = p_failure_reason, updated_at = now()
    WHERE id = p_payout_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.release_artist_order_earnings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_artist_order_earnings(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.hold_artist_order_earnings(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hold_artist_order_earnings(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.complete_artist_payout(uuid, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_artist_payout(uuid, text, boolean, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.credit_artist_ticket_sale(uuid, timestamptz, integer) TO service_role;
