-- Ecosystem M8: Friends System (graph, presence, activity, friend DM, watch parties)

CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');

CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id, status);
CREATE INDEX idx_friendships_requester ON public.friendships(requester_id, status);

CREATE TABLE public.user_follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE TABLE public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.friend_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verb TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_friend_activity_actor ON public.friend_activity_events(actor_id, created_at DESC);

CREATE TABLE public.friend_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_high UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_low < user_high),
  UNIQUE (user_low, user_high)
);

CREATE TABLE public.friend_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.friend_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_friend_messages_conv ON public.friend_messages(conversation_id, created_at DESC);

CREATE TABLE public.watch_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  invite_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'live', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.watch_party_members (
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (party_id, user_id)
);

CREATE TABLE public.watch_party_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_watch_party_messages ON public.watch_party_messages(party_id, created_at DESC);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Friendships read involved" ON public.friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Friendships request" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Friendships respond" ON public.friendships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "User follows public read" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "User follows manage own" ON public.user_follows
  FOR ALL USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Presence public read" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "Presence upsert own" ON public.user_presence
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Activity public read" ON public.friend_activity_events FOR SELECT USING (true);
CREATE POLICY "Activity insert own" ON public.friend_activity_events
  FOR INSERT WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "Friend conv read participants" ON public.friend_conversations
  FOR SELECT USING (auth.uid() = user_low OR auth.uid() = user_high);
CREATE POLICY "Friend conv insert participant" ON public.friend_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_low OR auth.uid() = user_high);

CREATE POLICY "Friend messages read" ON public.friend_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.friend_conversations c
      WHERE c.id = conversation_id AND (c.user_low = auth.uid() OR c.user_high = auth.uid())
    )
  );
CREATE POLICY "Friend messages insert" ON public.friend_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.friend_conversations c
      WHERE c.id = conversation_id AND (c.user_low = auth.uid() OR c.user_high = auth.uid())
    )
  );

CREATE POLICY "Watch parties read" ON public.watch_parties FOR SELECT USING (true);
CREATE POLICY "Watch parties host insert" ON public.watch_parties
  FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Watch party members read" ON public.watch_party_members FOR SELECT USING (true);
CREATE POLICY "Watch party members join" ON public.watch_party_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Watch party chat read" ON public.watch_party_messages FOR SELECT USING (true);
CREATE POLICY "Watch party chat insert" ON public.watch_party_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.watch_party_members m
      WHERE m.party_id = watch_party_messages.party_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin friends" ON public.friendships
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
