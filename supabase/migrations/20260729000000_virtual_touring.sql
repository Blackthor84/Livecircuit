-- Virtual Touring: audience modes, tour stop branding, passport rewards, local communities

CREATE TYPE public.event_audience_mode AS ENUM (
  'worldwide',
  'us_only',
  'local_priority',
  'local_only',
  'invite_only',
  'subscribers_only',
  'vip_only'
);

CREATE TYPE public.tour_sponsorship_scope AS ENUM (
  'arena',
  'city_stop',
  'full_tour'
);

-- Tour stop location + audience settings
ALTER TABLE public.tour_stops
  ADD COLUMN IF NOT EXISTS tour_city TEXT,
  ADD COLUMN IF NOT EXISTS tour_state_code TEXT,
  ADD COLUMN IF NOT EXISTS tour_state_name TEXT,
  ADD COLUMN IF NOT EXISTS doors_open_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS show_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS audience_mode public.event_audience_mode NOT NULL DEFAULT 'worldwide',
  ADD COLUMN IF NOT EXISTS local_priority_minutes INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Denormalized on events for fast access checks
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS tour_city TEXT,
  ADD COLUMN IF NOT EXISTS tour_state_code TEXT,
  ADD COLUMN IF NOT EXISTS tour_state_name TEXT,
  ADD COLUMN IF NOT EXISTS doors_open_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS show_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS audience_mode public.event_audience_mode NOT NULL DEFAULT 'worldwide',
  ADD COLUMN IF NOT EXISTS local_priority_minutes INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Local vs global chat channels
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'global';

CREATE INDEX IF NOT EXISTS idx_chat_messages_event_channel
  ON public.chat_messages(event_id, channel, created_at DESC);

-- Per-stop fan communities (Boston Fans, Providence Fans, etc.)
CREATE TABLE IF NOT EXISTS public.tour_stop_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_stop_id UUID NOT NULL REFERENCES public.tour_stops(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  city_name TEXT NOT NULL,
  state_code TEXT,
  slug TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tour_stop_id),
  UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_tour_stop_communities_tour ON public.tour_stop_communities(tour_id);

CREATE TABLE IF NOT EXISTS public.tour_stop_community_members (
  community_id UUID NOT NULL REFERENCES public.tour_stop_communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

-- Invite-only event access list
CREATE TABLE IF NOT EXISTS public.event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  CONSTRAINT event_invites_user_or_email CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_invites_user
  ON public.event_invites(event_id, user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_invites_email
  ON public.event_invites(event_id, lower(email)) WHERE email IS NOT NULL;

-- Tour-level sponsorship (arena / city stop / full tour)
CREATE TABLE IF NOT EXISTS public.tour_sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  scope public.tour_sponsorship_scope NOT NULL,
  tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
  tour_stop_id UUID REFERENCES public.tour_stops(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  sponsor_label TEXT NOT NULL,
  logo_url TEXT,
  contract_starts_at DATE,
  contract_ends_at DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_sponsorships_tour ON public.tour_sponsorships(tour_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_tour_sponsorships_stop ON public.tour_sponsorships(tour_stop_id) WHERE is_active;

-- Viewer analytics rollups (local vs remote)
CREATE TABLE IF NOT EXISTS public.virtual_touring_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
  tour_stop_id UUID REFERENCES public.tour_stops(id) ON DELETE SET NULL,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  analytics_date DATE NOT NULL,
  tour_city TEXT,
  tour_state_code TEXT,
  local_viewers INTEGER NOT NULL DEFAULT 0,
  remote_viewers INTEGER NOT NULL DEFAULT 0,
  total_watch_seconds BIGINT NOT NULL DEFAULT 0,
  local_watch_seconds BIGINT NOT NULL DEFAULT 0,
  chat_messages INTEGER NOT NULL DEFAULT 0,
  local_chat_messages INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, analytics_date)
);

CREATE INDEX IF NOT EXISTS idx_vt_analytics_artist_date
  ON public.virtual_touring_analytics_daily(artist_id, analytics_date DESC);

CREATE INDEX IF NOT EXISTS idx_vt_analytics_city
  ON public.virtual_touring_analytics_daily(tour_city, tour_state_code);

-- Passport: link stamps to tours
ALTER TABLE public.fan_passport_stamps
  ADD COLUMN IF NOT EXISTS tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tour_title TEXT;

CREATE INDEX IF NOT EXISTS idx_fan_passport_stamps_tour ON public.fan_passport_stamps(user_id, tour_id);

-- Tour reward achievements
INSERT INTO public.fan_passport_achievement_defs (slug, name, description, metric, target_value, sort_order)
VALUES
  ('bronze_tour_5', 'Bronze Tour Badge', 'Attend 5 tour stops.', 'stamp_count', 5, 10),
  ('silver_tour_10', 'Silver Tour Badge', 'Attend 10 tour stops.', 'stamp_count', 10, 11),
  ('gold_tour_complete', 'Gold Tour Completion', 'Complete an entire tour.', 'tours_completed', 1, 12),
  ('road_warrior_25', 'Road Warrior', 'Visit 25 different cities on tour.', 'distinct_cities', 25, 13)
ON CONFLICT (slug) DO NOTHING;

-- Sync function: copy touring fields from tour_stops → events
CREATE OR REPLACE FUNCTION public.sync_event_touring_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.events e
  SET
    tour_city = NEW.tour_city,
    tour_state_code = NEW.tour_state_code,
    tour_state_name = NEW.tour_state_name,
    doors_open_at = COALESCE(NEW.doors_open_at, NEW.scheduled_at - INTERVAL '30 minutes'),
    show_starts_at = COALESCE(NEW.show_starts_at, NEW.scheduled_at),
    audience_mode = NEW.audience_mode,
    local_priority_minutes = NEW.local_priority_minutes,
    invite_code = NEW.invite_code,
    scheduled_at = NEW.scheduled_at
  WHERE e.tour_stop_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tour_stops_sync_event_touring ON public.tour_stops;
CREATE TRIGGER tour_stops_sync_event_touring
  AFTER INSERT OR UPDATE OF
    tour_city, tour_state_code, tour_state_name,
    doors_open_at, show_starts_at, scheduled_at,
    audience_mode, local_priority_minutes, invite_code
  ON public.tour_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_touring_fields();

-- Auto-create community when stop has a city
CREATE OR REPLACE FUNCTION public.ensure_tour_stop_community()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  community_slug TEXT;
BEGIN
  IF NEW.tour_city IS NULL OR trim(NEW.tour_city) = '' THEN
    RETURN NEW;
  END IF;

  community_slug := lower(regexp_replace(
    coalesce(NEW.tour_city, 'stop') || '-fans-' || substr(NEW.id::text, 1, 8),
    '[^a-z0-9]+', '-', 'g'
  ));

  INSERT INTO public.tour_stop_communities (tour_stop_id, tour_id, city_name, state_code, slug)
  VALUES (NEW.id, NEW.tour_id, NEW.tour_city, NEW.tour_state_code, community_slug)
  ON CONFLICT (tour_stop_id) DO UPDATE
  SET city_name = EXCLUDED.city_name, state_code = EXCLUDED.state_code;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tour_stops_ensure_community ON public.tour_stops;
CREATE TRIGGER tour_stops_ensure_community
  AFTER INSERT OR UPDATE OF tour_city, tour_state_code
  ON public.tour_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_tour_stop_community();

-- Backfill show times from scheduled_at
UPDATE public.tour_stops
SET
  show_starts_at = COALESCE(show_starts_at, scheduled_at),
  doors_open_at = COALESCE(doors_open_at, scheduled_at - INTERVAL '30 minutes')
WHERE show_starts_at IS NULL OR doors_open_at IS NULL;

UPDATE public.events e
SET
  show_starts_at = ts.show_starts_at,
  doors_open_at = ts.doors_open_at,
  tour_city = ts.tour_city,
  tour_state_code = ts.tour_state_code,
  tour_state_name = ts.tour_state_name,
  audience_mode = ts.audience_mode,
  local_priority_minutes = ts.local_priority_minutes,
  invite_code = ts.invite_code
FROM public.tour_stops ts
WHERE e.tour_stop_id = ts.id;

ALTER TABLE public.tour_stop_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_stop_community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_touring_analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tour communities public read" ON public.tour_stop_communities FOR SELECT USING (true);
CREATE POLICY "Community members read own" ON public.tour_stop_community_members FOR SELECT USING (true);
CREATE POLICY "Community members join self" ON public.tour_stop_community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Event invites read own" ON public.event_invites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tour sponsorships public read" ON public.tour_sponsorships FOR SELECT USING (is_active = true);
CREATE POLICY "VT analytics admin read" ON public.virtual_touring_analytics_daily FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);
