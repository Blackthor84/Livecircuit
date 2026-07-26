-- Milestone 5: artists can attach placeholder streams when creating events from tour stops

CREATE POLICY "Artist manages streams for own events" ON public.streams
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
  );
