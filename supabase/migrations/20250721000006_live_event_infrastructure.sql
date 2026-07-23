-- Milestone 7: live room mutes and moderation updates

CREATE TABLE public.event_chat_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_chat_mutes_event ON public.event_chat_mutes(event_id);

ALTER TABLE public.event_chat_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mutes readable by artist or self" ON public.event_chat_mutes
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Artist mutes on own events" ON public.event_chat_mutes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Artist unmutes on own events" ON public.event_chat_mutes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Artist soft-delete chat on own events" ON public.chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Moderation logs insert staff" ON public.moderation_logs
  FOR INSERT WITH CHECK (
    auth.uid() = admin_id
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR EXISTS (
        SELECT 1 FROM public.chat_messages cm
        JOIN public.events e ON e.id = cm.event_id
        JOIN public.artists a ON a.id = e.artist_id
        WHERE cm.id = message_id AND a.user_id = auth.uid()
      )
      OR (
        message_id IS NULL
        AND target_user_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.events e
          JOIN public.artists a ON a.id = e.artist_id
          WHERE a.user_id = auth.uid()
        )
      )
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
