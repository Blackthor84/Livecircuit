-- Ecosystem M15: LiveCircuit Awards (annual ceremony, nominees, fan voting, archive)

CREATE TYPE public.award_ceremony_status AS ENUM ('nomination', 'voting', 'live', 'archived');

CREATE TYPE public.award_category AS ENUM (
  'artist_of_the_year',
  'concert_of_the_year',
  'comedian_of_the_year',
  'dj_of_the_year',
  'podcast_of_the_year',
  'venue_of_the_year',
  'best_new_artist',
  'fan_favorite',
  'best_community',
  'highest_rated_event'
);

CREATE TYPE public.award_nominee_type AS ENUM ('artist', 'event', 'venue');

CREATE TABLE public.livecircuit_award_ceremonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  status public.award_ceremony_status NOT NULL DEFAULT 'nomination',
  tagline TEXT,
  voting_ends_at TIMESTAMPTZ NOT NULL,
  ceremony_at TIMESTAMPTZ NOT NULL,
  live_stream_url TEXT,
  archive_summary TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_award_ceremonies_status ON public.livecircuit_award_ceremonies(status, year DESC);

CREATE TABLE public.livecircuit_award_nominees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ceremony_id UUID NOT NULL REFERENCES public.livecircuit_award_ceremonies(id) ON DELETE CASCADE,
  category public.award_category NOT NULL,
  nominee_type public.award_nominee_type NOT NULL,
  ref_id UUID,
  display_name TEXT NOT NULL,
  subtitle TEXT,
  blurb TEXT,
  image_url TEXT,
  link_href TEXT,
  score NUMERIC NOT NULL DEFAULT 0,
  vote_count INTEGER NOT NULL DEFAULT 0,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  announced_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ceremony_id, category, nominee_type, ref_id)
);

CREATE INDEX idx_award_nominees_ceremony ON public.livecircuit_award_nominees(ceremony_id, category, sort_order);

CREATE TABLE public.livecircuit_award_votes (
  ceremony_id UUID NOT NULL REFERENCES public.livecircuit_award_ceremonies(id) ON DELETE CASCADE,
  category public.award_category NOT NULL,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nominee_id UUID NOT NULL REFERENCES public.livecircuit_award_nominees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ceremony_id, category, voter_id)
);

CREATE INDEX idx_award_votes_nominee ON public.livecircuit_award_votes(nominee_id);

ALTER TABLE public.livecircuit_award_ceremonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livecircuit_award_nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livecircuit_award_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Award ceremonies public read" ON public.livecircuit_award_ceremonies FOR SELECT USING (true);
CREATE POLICY "Admin award ceremonies" ON public.livecircuit_award_ceremonies
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Award nominees public read" ON public.livecircuit_award_nominees FOR SELECT USING (true);
CREATE POLICY "Admin award nominees" ON public.livecircuit_award_nominees
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Award votes public read" ON public.livecircuit_award_votes FOR SELECT USING (true);
CREATE POLICY "Award vote insert" ON public.livecircuit_award_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);

INSERT INTO public.livecircuit_award_ceremonies (
  slug, title, year, status, tagline, voting_ends_at, ceremony_at, live_stream_url, sort_order
)
VALUES
  (
    '2025',
    'LiveCircuit Awards 2025',
    2025,
    'archived',
    'The inaugural circuit honors.',
    '2025-12-01T00:00:00Z',
    '2025-12-15T20:00:00Z',
    NULL,
    1
  ),
  (
    '2026',
    'LiveCircuit Awards 2026',
    2026,
    'voting',
    'Fan votes decide the stars of the year.',
    '2026-12-01T23:59:59Z',
    '2026-12-15T20:00:00Z',
    'https://livecircuit.example/awards-live',
    2
  );
