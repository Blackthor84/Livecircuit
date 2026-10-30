-- FastPay: performance-completion-based payout eligibility (feature-flagged at application layer)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payout_eligibility_policy text NOT NULL DEFAULT 'standard_hold'
    CHECK (payout_eligibility_policy IN ('standard_hold', 'fastpay'));

CREATE INDEX IF NOT EXISTS idx_orders_event_id ON public.orders (event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_fastpay_pending
  ON public.orders (event_id, available_at)
  WHERE payout_eligibility_policy = 'fastpay' AND artist_payout_status IN ('pending', 'partially_refunded');

UPDATE public.orders o
SET event_id = (o.metadata->>'event_id')::uuid
WHERE o.event_id IS NULL
  AND o.metadata ? 'event_id'
  AND (o.metadata->>'event_id') ~* '^[0-9a-f-]{36}$';

INSERT INTO public.monetization_feature_flags (flag_key, label, description, visibility, is_enabled)
VALUES (
  'artist_fastpay',
  'Artist FastPay',
  'Release ticket earnings on the next business day after verified performance completion (replaces fixed hold for new orders when enabled).',
  'coming_soon',
  false
)
ON CONFLICT (flag_key) DO NOTHING;

DROP FUNCTION IF EXISTS public.credit_artist_ticket_sale(uuid, timestamptz, integer);

CREATE OR REPLACE FUNCTION public.credit_artist_ticket_sale(
  p_order_id uuid,
  p_payment_success_at timestamptz DEFAULT now(),
  p_hold_days integer DEFAULT 7,
  p_payout_policy text DEFAULT 'standard_hold'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_available_at timestamptz;
  v_policy text;
BEGIN
  v_policy := CASE WHEN p_payout_policy = 'fastpay' THEN 'fastpay' ELSE 'standard_hold' END;

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

  IF v_policy = 'fastpay' THEN
    v_available_at := NULL;
  ELSE
    v_available_at := p_payment_success_at + make_interval(days => p_hold_days);
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
    event_id = COALESCE(event_id, NULLIF(metadata->>'event_id', '')::uuid),
    payment_success_at = COALESCE(payment_success_at, p_payment_success_at),
    payout_eligibility_policy = v_policy,
    available_at = CASE
      WHEN v_policy = 'fastpay' THEN NULL
      ELSE COALESCE(available_at, v_available_at)
    END,
    remaining_artist_earnings_cents = v_order.artist_earnings_cents,
    artist_payout_status = 'pending'
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_fastpay_eligibility_for_event(
  p_event_id uuid,
  p_available_at timestamptz
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_event.status <> 'ended' OR v_event.ended_at IS NULL OR v_event.started_at IS NULL THEN
    RETURN 0;
  END IF;

  IF v_event.status = 'cancelled' THEN
    RETURN 0;
  END IF;

  UPDATE public.orders o
  SET available_at = p_available_at, updated_at = now()
  WHERE o.status = 'paid'
    AND o.order_type = 'ticket'
    AND o.payout_eligibility_policy = 'fastpay'
    AND o.artist_payout_status IN ('pending', 'partially_refunded')
    AND COALESCE(o.remaining_artist_earnings_cents, o.artist_earnings_cents, 0) > 0
    AND o.available_at IS NULL
    AND o.artist_payout_status <> 'held'
    AND (
      o.event_id = p_event_id
      OR (o.metadata->>'event_id')::uuid = p_event_id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
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
  v_event public.events%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_order.artist_payout_status NOT IN ('pending', 'partially_refunded') THEN
    RETURN 0;
  END IF;

  IF v_order.status <> 'paid' THEN RETURN 0; END IF;

  IF v_order.artist_payout_status = 'held' THEN RETURN 0; END IF;

  IF v_order.available_at IS NULL OR v_order.available_at > now() THEN
    RETURN 0;
  END IF;

  IF v_order.payout_eligibility_policy = 'fastpay' THEN
    v_event_id := COALESCE(v_order.event_id, NULLIF(v_order.metadata->>'event_id', '')::uuid);
    IF v_event_id IS NULL THEN RETURN 0; END IF;

    SELECT * INTO v_event FROM public.events WHERE id = v_event_id;
    IF NOT FOUND THEN RETURN 0; END IF;
    IF v_event.status <> 'ended' OR v_event.ended_at IS NULL OR v_event.started_at IS NULL THEN
      RETURN 0;
    END IF;
    IF v_event.status = 'cancelled' THEN RETURN 0; END IF;
  END IF;

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

GRANT EXECUTE ON FUNCTION public.apply_fastpay_eligibility_for_event(uuid, timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.apply_fastpay_eligibility_for_event(uuid, timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.credit_artist_ticket_sale(uuid, timestamptz, integer, text) TO service_role;
