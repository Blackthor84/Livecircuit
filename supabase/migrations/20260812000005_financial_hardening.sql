-- Phase 5: dispute tracking, receivable lifecycle, payout locking

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artist_recovery_status') THEN
    CREATE TYPE public.artist_recovery_status AS ENUM (
      'none',
      'pending_recovery',
      'partially_recovered',
      'recovered',
      'written_off'
    );
  END IF;
END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recovery_status public.artist_recovery_status NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS public.artist_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL,
  stripe_dispute_id text NOT NULL UNIQUE,
  stripe_charge_id text,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  stripe_transfer_reversal_id text,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  stripe_dispute_status text NOT NULL,
  livecircuit_status text NOT NULL DEFAULT 'open',
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artist_disputes_order ON public.artist_disputes (order_id);
CREATE INDEX IF NOT EXISTS idx_artist_disputes_artist ON public.artist_disputes (artist_id);

CREATE TABLE IF NOT EXISTS public.artist_receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  recovered_cents integer NOT NULL DEFAULT 0 CHECK (recovered_cents >= 0),
  status public.artist_recovery_status NOT NULL DEFAULT 'pending_recovery',
  source_reference_id text NOT NULL UNIQUE,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (recovered_cents <= amount_cents)
);

CREATE INDEX IF NOT EXISTS idx_artist_receivables_artist ON public.artist_receivables (artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_receivables_status ON public.artist_receivables (status);

ALTER TABLE public.artist_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_receivables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artist_disputes_owner_read" ON public.artist_disputes;
CREATE POLICY "artist_disputes_owner_read" ON public.artist_disputes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS "artist_receivables_owner_read" ON public.artist_receivables;
CREATE POLICY "artist_receivables_owner_read" ON public.artist_receivables
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
    OR public.is_admin_user()
  );

CREATE OR REPLACE FUNCTION public.record_artist_receivable(
  p_order_id uuid,
  p_amount_cents integer,
  p_reference_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF p_amount_cents <= 0 THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.artist_receivables WHERE source_reference_id = p_reference_id) THEN
    RETURN;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.artist_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.artist_receivables (
    artist_id, order_id, amount_cents, source_reference_id, status
  ) VALUES (
    v_order.artist_id, p_order_id, p_amount_cents, p_reference_id, 'pending_recovery'
  );

  UPDATE public.orders
  SET recovery_status = 'pending_recovery'
  WHERE id = p_order_id
    AND recovery_status = 'none';
END;
$$;

CREATE OR REPLACE FUNCTION public.record_artist_recovery_payment(
  p_receivable_id uuid,
  p_amount_cents integer,
  p_reference_id text,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.artist_receivables%ROWTYPE;
  v_new_recovered integer;
  v_new_status public.artist_recovery_status;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.artist_balance_transactions WHERE reference_id = p_reference_id
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_row FROM public.artist_receivables WHERE id = p_receivable_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receivable not found'; END IF;

  v_new_recovered := LEAST(v_row.amount_cents, v_row.recovered_cents + p_amount_cents);
  v_new_status := CASE
    WHEN v_new_recovered >= v_row.amount_cents THEN 'recovered'::public.artist_recovery_status
    WHEN v_new_recovered > 0 THEN 'partially_recovered'::public.artist_recovery_status
    ELSE v_row.status
  END;

  UPDATE public.artist_receivables
  SET
    recovered_cents = v_new_recovered,
    status = v_new_status,
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_receivable_id;

  UPDATE public.artist_balances
  SET
    receivable_cents = GREATEST(0, receivable_cents - LEAST(p_amount_cents, v_row.amount_cents - v_row.recovered_cents)),
    updated_at = now()
  WHERE artist_id = v_row.artist_id;

  UPDATE public.orders
  SET recovery_status = v_new_status
  WHERE id = v_row.order_id;

  INSERT INTO public.artist_balance_transactions (
    artist_id, order_id, transaction_type, artist_earnings_cents, reference_id, metadata
  ) VALUES (
    v_row.artist_id, v_row.order_id, 'adjustment', -LEAST(p_amount_cents, v_row.amount_cents - v_row.recovered_cents),
    p_reference_id, jsonb_build_object('receivable_id', p_receivable_id, 'recovery', true)
  );
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
  v_balance_pending integer;
  v_balance_available integer;
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

  SELECT pending_cents, available_cents
  INTO v_balance_pending, v_balance_available
  FROM public.artist_balances
  WHERE artist_id = v_order.artist_id
  FOR UPDATE;

  v_from_pending := LEAST(v_artist_reversal, COALESCE(v_balance_pending, 0));
  v_from_available := LEAST(v_artist_reversal - v_from_pending, GREATEST(0, COALESCE(v_balance_available, 0)));
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
    jsonb_build_object('full_refund', p_full_refund, 'receivable_cents', v_to_receivable),
    v_ref_key
  );

  IF v_to_receivable > 0 THEN
    PERFORM public.record_artist_receivable(p_order_id, v_to_receivable, 'receivable:' || v_ref_key);
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
    END,
    recovery_status = CASE
      WHEN v_to_receivable > 0 THEN 'pending_recovery'::public.artist_recovery_status
      ELSE recovery_status
    END
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_reserve_artist_payout(
  p_artist_id uuid,
  p_amount_cents integer,
  p_idempotency_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance public.artist_balances%ROWTYPE;
  v_existing uuid;
  v_payout_id uuid;
BEGIN
  SELECT id INTO v_existing
  FROM public.artist_payouts
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN RETURN v_existing; END IF;

  IF EXISTS (
    SELECT 1 FROM public.artist_payouts
    WHERE artist_id = p_artist_id AND status = 'processing'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_balance FROM public.artist_balances WHERE artist_id = p_artist_id FOR UPDATE;
  IF NOT FOUND OR v_balance.available_cents < p_amount_cents THEN
    RETURN NULL;
  END IF;

  UPDATE public.artist_balances
  SET available_cents = available_cents - p_amount_cents, updated_at = now()
  WHERE artist_id = p_artist_id;

  INSERT INTO public.artist_payouts (artist_id, amount_cents, status, idempotency_key, initiated_at)
  VALUES (p_artist_id, p_amount_cents, 'processing', p_idempotency_key, now())
  RETURNING id INTO v_payout_id;

  RETURN v_payout_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_artist_payout_reservation(
  p_payout_id uuid,
  p_restore_available boolean DEFAULT true
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
  IF NOT FOUND OR v_payout.status <> 'processing' THEN RETURN; END IF;

  IF p_restore_available THEN
    UPDATE public.artist_balances
    SET available_cents = available_cents + v_payout.amount_cents, updated_at = now()
    WHERE artist_id = v_payout.artist_id;
  END IF;

  UPDATE public.artist_payouts
  SET status = 'failed', updated_at = now()
  WHERE id = p_payout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_artist_receivable(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_artist_receivable(uuid, integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.record_artist_recovery_payment(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_artist_recovery_payment(uuid, integer, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.try_reserve_artist_payout(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_reserve_artist_payout(uuid, integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.release_artist_payout_reservation(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_artist_payout_reservation(uuid, boolean) TO service_role;
