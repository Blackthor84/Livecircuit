-- Producer Mode: backstage production staff with granular permissions

CREATE TABLE public.event_producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT,
  invite_token TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  staff_role TEXT NOT NULL DEFAULT 'assistant_producer' CHECK (
    staff_role IN ('lead_producer', 'assistant_producer', 'moderator', 'sound_engineer', 'lighting_engineer')
  ),
  producer_label TEXT NOT NULL DEFAULT 'custom' CHECK (
    producer_label IN (
      'manager', 'band_member', 'friend', 'family_member', 'tour_manager',
      'moderator', 'sound_engineer', 'lighting_operator', 'custom'
    )
  ),
  custom_label TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  permanent BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX event_producers_event_user_idx
  ON public.event_producers (event_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX event_producers_event_id_idx ON public.event_producers (event_id);
CREATE INDEX event_producers_invite_token_idx ON public.event_producers (invite_token)
  WHERE invite_token IS NOT NULL;

CREATE TABLE public.backstage_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX backstage_chat_event_idx ON public.backstage_chat_messages (event_id, created_at DESC);

CREATE TABLE public.event_chat_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  banned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE TABLE public.producer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  producer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  timestamp_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX producer_notes_event_idx ON public.producer_notes (event_id, created_at DESC);

ALTER TABLE public.stream_rehearsals
  ADD COLUMN IF NOT EXISTS producer_checklist JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.event_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backstage_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_chat_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_notes ENABLE ROW LEVEL SECURITY;

-- Producers: artist manages, producers read own row
CREATE POLICY "Artists manage event producers" ON public.event_producers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Producers read own assignment" ON public.event_producers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Producers accept invite" ON public.event_producers
  FOR UPDATE USING (user_id = auth.uid() OR invite_token IS NOT NULL);

-- Backstage chat: artist, co-hosts, accepted producers
CREATE POLICY "Backstage chat read" ON public.backstage_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_hosts eh
      WHERE eh.event_id = backstage_chat_messages.event_id AND eh.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_producers ep
      WHERE ep.event_id = backstage_chat_messages.event_id
        AND ep.user_id = auth.uid()
        AND ep.status = 'accepted'
    )
  );

CREATE POLICY "Backstage chat insert" ON public.backstage_chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.events e
        JOIN public.artists a ON a.id = e.artist_id
        WHERE e.id = event_id AND a.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.event_hosts eh
        WHERE eh.event_id = backstage_chat_messages.event_id AND eh.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.event_producers ep
        WHERE ep.event_id = backstage_chat_messages.event_id
          AND ep.user_id = auth.uid()
          AND ep.status = 'accepted'
      )
    )
  );

-- Chat bans
CREATE POLICY "Chat bans readable by staff" ON public.event_chat_bans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_hosts eh
      WHERE eh.event_id = event_chat_bans.event_id AND eh.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_producers ep
      WHERE ep.event_id = event_chat_bans.event_id
        AND ep.user_id = auth.uid()
        AND ep.status = 'accepted'
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Staff ban users" ON public.event_chat_bans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_hosts eh
      WHERE eh.event_id = event_chat_bans.event_id AND eh.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_producers ep
      WHERE ep.event_id = event_chat_bans.event_id
        AND ep.user_id = auth.uid()
        AND ep.status = 'accepted'
        AND (ep.permissions->>'ban_users')::boolean IS TRUE
    )
  );

CREATE POLICY "Staff remove bans" ON public.event_chat_bans
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_hosts eh
      WHERE eh.event_id = event_chat_bans.event_id AND eh.user_id = auth.uid()
    )
  );

-- Producer notes
CREATE POLICY "Producer notes read by staff" ON public.producer_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_producers ep
      WHERE ep.event_id = producer_notes.event_id
        AND ep.user_id = auth.uid()
        AND ep.status = 'accepted'
    )
  );

CREATE POLICY "Producers write notes" ON public.producer_notes
  FOR INSERT WITH CHECK (
    auth.uid() = producer_id
    AND EXISTS (
      SELECT 1 FROM public.event_producers ep
      WHERE ep.event_id = producer_notes.event_id
        AND ep.user_id = auth.uid()
        AND ep.status = 'accepted'
    )
  );

-- Extend moderation RLS to co-hosts and producers with permission
CREATE POLICY "Co-hosts mute chat" ON public.event_chat_mutes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_hosts eh
      WHERE eh.event_id = event_chat_mutes.event_id AND eh.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_producers ep
      WHERE ep.event_id = event_chat_mutes.event_id
        AND ep.user_id = auth.uid()
        AND ep.status = 'accepted'
        AND (ep.permissions->>'mute_users')::boolean IS TRUE
    )
  );

CREATE POLICY "Co-hosts delete chat" ON public.chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.event_hosts eh
      WHERE eh.event_id = chat_messages.event_id AND eh.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_producers ep
      WHERE ep.event_id = chat_messages.event_id
        AND ep.user_id = auth.uid()
        AND ep.status = 'accepted'
        AND (ep.permissions->>'delete_chat')::boolean IS TRUE
    )
  );

CREATE POLICY "Staff pin chat" ON public.chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = chat_messages.event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_producers ep
      WHERE ep.event_id = chat_messages.event_id
        AND ep.user_id = auth.uid()
        AND ep.status = 'accepted'
        AND (ep.permissions->>'pin_messages')::boolean IS TRUE
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.backstage_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.producer_notes;
