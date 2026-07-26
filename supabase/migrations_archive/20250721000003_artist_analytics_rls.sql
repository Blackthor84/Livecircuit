-- Artists can read commerce tied to their artist_id (dashboard analytics)

CREATE POLICY "Artist reads own orders" ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = orders.artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Artist reads tickets for their events" ON public.tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = tickets.event_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Artist reads tips received" ON public.tips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = tips.artist_id AND a.user_id = auth.uid()
    )
  );

-- Drop overly broad tip read if it conflicts; keep public read for fans viewing tips on events
-- (multiple SELECT policies OR together in Postgres RLS)
