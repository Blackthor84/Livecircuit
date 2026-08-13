-- Phase 1 verification queries (read-only except controlled RPC calls)

-- 1) Functions exist
SELECT proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('assert_ticket_capacity_available', 'create_ticket_for_order')
ORDER BY proname;

-- 2) assert_ticket_capacity_available rejects unknown event (expect error)
DO $$
BEGIN
  PERFORM public.assert_ticket_capacity_available(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'general',
    1,
    NULL
  );
  RAISE EXCEPTION 'VERIFY_FAIL: unknown event should have raised an exception';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM ILIKE '%capacity%' OR SQLERRM ILIKE '%not on sale%' OR SQLERRM ILIKE '%not available%' THEN
      RAISE NOTICE 'PASS assert_unknown_event: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'VERIFY_FAIL assert_unknown_event unexpected: %', SQLERRM;
    END IF;
END $$;

-- 3) assert_ticket_capacity_available rejects draft events
DO $$
DECLARE
  v_draft_event uuid;
BEGIN
  SELECT e.id
  INTO v_draft_event
  FROM public.events e
  JOIN public.tour_stops ts ON ts.id = e.tour_stop_id
  WHERE e.status = 'draft'
  LIMIT 1;

  IF v_draft_event IS NULL THEN
    RAISE NOTICE 'SKIP assert_draft_event: no draft event with tour_stop found';
    RETURN;
  END IF;

  PERFORM public.assert_ticket_capacity_available(v_draft_event, 'general', 1, NULL);
  RAISE EXCEPTION 'VERIFY_FAIL: draft event should not be purchasable';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM ILIKE '%not on sale%' THEN
      RAISE NOTICE 'PASS assert_draft_event: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'VERIFY_FAIL assert_draft_event unexpected: %', SQLERRM;
    END IF;
END $$;

-- 4) create_ticket_for_order is idempotent for an existing paid ticket order
DO $$
DECLARE
  v_order_id uuid;
  v_event_id uuid;
  v_user_id uuid;
  v_tier text;
  v_price integer;
  v_first uuid;
  v_second uuid;
BEGIN
  SELECT t.order_id, t.event_id, t.user_id, t.tier, t.price_cents
  INTO v_order_id, v_event_id, v_user_id, v_tier, v_price
  FROM public.tickets t
  JOIN public.orders o ON o.id = t.order_id
  WHERE o.status = 'paid'
  LIMIT 1;

  IF v_order_id IS NULL THEN
    RAISE NOTICE 'SKIP create_ticket_idempotent: no paid ticket order found';
    RETURN;
  END IF;

  v_first := public.create_ticket_for_order(v_event_id, v_user_id, v_order_id, v_tier, v_price);
  v_second := public.create_ticket_for_order(v_event_id, v_user_id, v_order_id, v_tier, v_price);

  IF v_first = v_second THEN
    RAISE NOTICE 'PASS create_ticket_idempotent: same ticket id %', v_first;
  ELSE
    RAISE EXCEPTION 'VERIFY_FAIL create_ticket_idempotent: % vs %', v_first, v_second;
  END IF;
END $$;

-- 5) sold-out guard when capacity is full
DO $$
DECLARE
  v_event_id uuid;
  v_capacity integer;
  v_sold integer;
BEGIN
  SELECT e.id, ts.capacity, (
    SELECT COUNT(*)::integer FROM public.tickets t WHERE t.event_id = e.id AND t.tier = 'general'
  )
  INTO v_event_id, v_capacity, v_sold
  FROM public.events e
  JOIN public.tour_stops ts ON ts.id = e.tour_stop_id
  WHERE e.status IN ('scheduled', 'live')
    AND ts.capacity IS NOT NULL
    AND ts.capacity > 0
  ORDER BY (
    SELECT COUNT(*) FROM public.tickets t WHERE t.event_id = e.id AND t.tier = 'general'
  ) DESC
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE NOTICE 'SKIP assert_sold_out: no sellable event found';
    RETURN;
  END IF;

  IF v_sold < v_capacity THEN
    RAISE NOTICE 'SKIP assert_sold_out: nearest event still has capacity (sold % of %)', v_sold, v_capacity;
    RETURN;
  END IF;

  PERFORM public.assert_ticket_capacity_available(v_event_id, 'general', 1, NULL);
  RAISE EXCEPTION 'VERIFY_FAIL: sold out event should reject purchase';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM ILIKE '%sold out%' THEN
      RAISE NOTICE 'PASS assert_sold_out: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'VERIFY_FAIL assert_sold_out unexpected: %', SQLERRM;
    END IF;
END $$;
