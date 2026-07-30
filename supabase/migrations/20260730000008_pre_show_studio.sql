-- Pre-Show Studio: private rehearsals and test fan feedback

CREATE TABLE public.stream_rehearsals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
  access_mode TEXT NOT NULL DEFAULT 'self_only' CHECK (
    access_mode IN ('self_only', 'admin', 'moderator', 'test_fan', 'invite_link')
  ),
  invite_token TEXT UNIQUE,
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);

CREATE INDEX stream_rehearsals_event_id_idx ON public.stream_rehearsals (event_id);
CREATE INDEX stream_rehearsals_invite_token_idx ON public.stream_rehearsals (invite_token)
  WHERE invite_token IS NOT NULL;

CREATE TABLE public.rehearsal_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_label TEXT,
  audio_rating SMALLINT CHECK (audio_rating BETWEEN 1 AND 5),
  video_rating SMALLINT CHECK (video_rating BETWEEN 1 AND 5),
  lighting_rating SMALLINT CHECK (lighting_rating BETWEEN 1 AND 5),
  sync_rating SMALLINT CHECK (sync_rating BETWEEN 1 AND 5),
  overall_rating SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX rehearsal_feedback_event_id_idx ON public.rehearsal_feedback (event_id, created_at DESC);

ALTER TABLE public.stream_rehearsals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehearsal_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists read own rehearsals" ON public.stream_rehearsals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_hosts eh
      WHERE eh.event_id = stream_rehearsals.event_id AND eh.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Artists manage own rehearsals" ON public.stream_rehearsals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_hosts eh
      WHERE eh.event_id = stream_rehearsals.event_id AND eh.user_id = auth.uid()
    )
  );

CREATE POLICY "Rehearsal feedback read by hosts" ON public.rehearsal_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_hosts eh
      WHERE eh.event_id = rehearsal_feedback.event_id AND eh.user_id = auth.uid()
    )
    OR reviewer_id = auth.uid()
  );

CREATE POLICY "Reviewers submit feedback" ON public.rehearsal_feedback
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Reviewers read own feedback" ON public.rehearsal_feedback
  FOR SELECT USING (reviewer_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.rehearsal_feedback;
