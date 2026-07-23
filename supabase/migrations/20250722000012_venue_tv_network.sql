-- Ecosystem M12: Venue TV Network (per-venue channel, programs, auto playlists)

CREATE TYPE public.venue_tv_program_type AS ENUM (
  'upcoming_show',
  'trailer',
  'interview',
  'highlight',
  'music_video',
  'comedy_clip',
  'festival_announcement',
  'sponsor_commercial',
  'behind_scenes',
  'venue_news'
);

CREATE TABLE public.venue_tv_channels (
  venue_id UUID PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT 'Your venue channel on LiveCircuit',
  is_on_air BOOLEAN NOT NULL DEFAULT true,
  active_playlist_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.venue_tv_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  program_type public.venue_tv_program_type NOT NULL,
  source_key TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  thumbnail_url TEXT,
  link_href TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 180,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, source_key)
);

CREATE INDEX idx_venue_tv_programs_venue ON public.venue_tv_programs(venue_id, program_type);

CREATE TABLE public.venue_tv_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_auto_generated BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_tv_playlists_venue ON public.venue_tv_playlists(venue_id, is_active);

CREATE TABLE public.venue_tv_playlist_items (
  playlist_id UUID NOT NULL REFERENCES public.venue_tv_playlists(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.venue_tv_programs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (playlist_id, position),
  UNIQUE (playlist_id, program_id)
);

ALTER TABLE public.venue_tv_channels
  ADD CONSTRAINT venue_tv_channels_playlist_fkey
  FOREIGN KEY (active_playlist_id) REFERENCES public.venue_tv_playlists(id) ON DELETE SET NULL;

CREATE TABLE public.venue_tv_program_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.venue_tv_programs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_tv_views_program ON public.venue_tv_program_views(program_id, created_at DESC);

ALTER TABLE public.venue_tv_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_tv_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_tv_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_tv_playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_tv_program_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue TV channel public read" ON public.venue_tv_channels FOR SELECT USING (true);
CREATE POLICY "Venue TV programs public read" ON public.venue_tv_programs
  FOR SELECT USING (is_published = true OR public.is_admin_profile());
CREATE POLICY "Venue TV playlists public read" ON public.venue_tv_playlists FOR SELECT USING (true);
CREATE POLICY "Venue TV playlist items public read" ON public.venue_tv_playlist_items FOR SELECT USING (true);
CREATE POLICY "Venue TV views insert" ON public.venue_tv_program_views
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Venue TV views read admin" ON public.venue_tv_program_views
  FOR SELECT USING (public.is_admin_profile());

CREATE POLICY "Admin venue TV" ON public.venue_tv_channels
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
