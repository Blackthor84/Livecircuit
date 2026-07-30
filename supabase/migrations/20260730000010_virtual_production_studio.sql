-- Virtual Production Studio: production history and extended rehearsal data

ALTER TABLE public.rehearsal_feedback
  ADD COLUMN IF NOT EXISTS camera_rating SMALLINT CHECK (camera_rating BETWEEN 1 AND 5);

ALTER TABLE public.stream_rehearsals
  ADD COLUMN IF NOT EXISTS green_room_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS go_live_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sound_check_active BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE public.production_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('rehearsal', 'sound_check', 'go_live', 'post_show')),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  producer_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  fan_ratings JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical JSONB NOT NULL DEFAULT '{}'::jsonb,
  equipment JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX production_history_event_idx ON public.production_history (event_id, created_at DESC);

ALTER TABLE public.production_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Production history read by staff" ON public.production_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_producers ep
      WHERE ep.event_id = production_history.event_id
        AND ep.user_id = auth.uid()
        AND ep.status = 'accepted'
    )
    OR EXISTS (
      SELECT 1 FROM public.event_hosts eh
      WHERE eh.event_id = production_history.event_id AND eh.user_id = auth.uid()
    )
  );

CREATE POLICY "Production history insert by staff" ON public.production_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_producers ep
      WHERE ep.event_id = production_history.event_id
        AND ep.user_id = auth.uid()
        AND ep.status = 'accepted'
    )
  );
