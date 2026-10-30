-- FastPay QA: hold ticket earnings when performances are cancelled (no infinite pending)

CREATE OR REPLACE FUNCTION public.hold_fastpay_orders_for_event(
  p_event_id uuid,
  p_reason text DEFAULT 'event_cancelled'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.orders o
  SET
    artist_payout_status = 'held',
    available_at = NULL,
    metadata = COALESCE(o.metadata, '{}'::jsonb) || jsonb_build_object(
      'fastpay_hold_reason', p_reason,
      'fastpay_held_at', now()
    ),
    updated_at = now()
  WHERE o.status = 'paid'
    AND o.order_type = 'ticket'
    AND o.payout_eligibility_policy = 'fastpay'
    AND o.artist_payout_status IN ('pending', 'partially_refunded')
    AND COALESCE(o.remaining_artist_earnings_cents, o.artist_earnings_cents, 0) > 0
    AND (
      o.event_id = p_event_id
      OR (o.metadata->>'event_id')::uuid = p_event_id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.hold_fastpay_orders_for_event(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hold_fastpay_orders_for_event(uuid, text) TO service_role;

-- Idempotent: only set available_at when still null (prevents duplicate eligibility shifts)
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

  UPDATE public.orders o
  SET available_at = p_available_at, updated_at = now()
  WHERE o.status = 'paid'
    AND o.order_type = 'ticket'
    AND o.payout_eligibility_policy = 'fastpay'
    AND o.artist_payout_status IN ('pending', 'partially_refunded')
    AND COALESCE(o.remaining_artist_earnings_cents, o.artist_earnings_cents, 0) > 0
    AND o.available_at IS NULL
    AND (
      o.event_id = p_event_id
      OR (o.metadata->>'event_id')::uuid = p_event_id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
