-- Milestone 9: fan–artist messaging

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, fan_id)
);

CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_fan ON public.conversations(fan_id, last_message_at DESC);
CREATE INDEX idx_conversations_artist ON public.conversations(artist_id, last_message_at DESC);
CREATE INDEX idx_direct_messages_conversation ON public.direct_messages(conversation_id, created_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants read" ON public.conversations
  FOR SELECT USING (
    auth.uid() = fan_id
    OR EXISTS (
      SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Fan starts conversation" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Participants update conversation timestamp" ON public.conversations
  FOR UPDATE USING (
    auth.uid() = fan_id
    OR EXISTS (
      SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Direct messages read" ON public.direct_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          c.fan_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.artists a WHERE a.id = c.artist_id AND a.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Direct messages insert" ON public.direct_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          c.fan_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.artists a WHERE a.id = c.artist_id AND a.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Recipient marks read" ON public.direct_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          c.fan_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.artists a WHERE a.id = c.artist_id AND a.user_id = auth.uid()
          )
        )
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
