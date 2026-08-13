-- Phase 1: atomic ticket capacity checks and ticket creation for paid orders

CREATE OR REPLACE FUNCTION public.assert_ticket_capacity_available(
  p_event_id uuid,
  p_tier text,
  p_quantity integer DEFAULT 1,
  p_exclude_order_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity integer;
  v_allocated integer;
  v_event_status public.event_status;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'Invalid ticket quantity';
  END IF;

  SELECT e.status,
         CASE
           WHEN p_tier = 'vip' THEN COALESCE(ts.vip_capacity, ts.capacity)
           ELSE ts.capacity
         END
  INTO v_event_status, v_capacity
  FROM public.events e
  JOIN public.tour_stops ts ON ts.id = e.tour_stop_id
  WHERE e.id = p_event_id
  FOR UPDATE OF ts;

  IF v_capacity IS NULL THEN
    RAISE EXCEPTION 'Event has no ticket capacity configured';
  END IF;

  IF v_event_status = 'draft' THEN
    RAISE EXCEPTION 'Event is not on sale';
  END IF;

  IF v_event_status IN ('cancelled', 'ended') THEN
    RAISE EXCEPTION 'Event is not available for ticket sales';
  END IF;

  SELECT
    (SELECT COUNT(*)::integer FROM public.tickets t WHERE t.event_id = p_event_id AND t.tier = p_tier)
    + (
      SELECT COUNT(*)::integer
      FROM public.orders o
      WHERE o.status = 'pending'
        AND o.order_type = 'ticket'
        AND (o.metadata->>'event_id')::uuid = p_event_id
        AND COALESCE(o.metadata->>'tier', 'general') = p_tier
        AND (p_exclude_order_id IS NULL OR o.id <> p_exclude_order_id)
    )
  INTO v_allocated;

  IF v_allocated + p_quantity > v_capacity THEN
    RAISE EXCEPTION 'Sold out';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_ticket_for_order(
  p_event_id uuid,
  p_user_id uuid,
  p_order_id uuid,
  p_tier text,
  p_price_cents integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.tickets WHERE order_id = p_order_id) THEN
    SELECT id INTO v_ticket_id FROM public.tickets WHERE order_id = p_order_id LIMIT 1;
    RETURN v_ticket_id;
  END IF;

  PERFORM public.assert_ticket_capacity_available(p_event_id, p_tier, 1, p_order_id);

  INSERT INTO public.tickets (event_id, user_id, order_id, tier, price_cents)
  VALUES (p_event_id, p_user_id, p_order_id, p_tier, p_price_cents)
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_ticket_capacity_available(uuid, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_ticket_capacity_available(uuid, text, integer, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_ticket_for_order(uuid, uuid, uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_ticket_for_order(uuid, uuid, uuid, text, integer) TO service_role;
