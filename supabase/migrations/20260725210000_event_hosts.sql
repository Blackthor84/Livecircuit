-- Milestone 4: event co-hosts for multi-presenter live streams

CREATE TABLE public.event_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX event_hosts_event_id_idx ON public.event_hosts (event_id);
CREATE INDEX event_hosts_user_id_idx ON public.event_hosts (user_id);

ALTER TABLE public.event_hosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event hosts public read" ON public.event_hosts
  FOR SELECT USING (true);

CREATE POLICY "Artist adds event hosts" ON public.event_hosts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Artist removes event hosts" ON public.event_hosts
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR auth.uid() = user_id
  );
