-- Ecosystem M14: Digital Walk of Fame (permanent artist stars)

CREATE TYPE public.walk_of_fame_criterion AS ENUM (
  'attendance',
  'revenue',
  'years_active',
  'community_impact',
  'fan_votes',
  'awards',
  'venue_contributions'
);

CREATE TABLE public.artist_walk_of_fame_stars (
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  criterion public.walk_of_fame_criterion NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metric_value NUMERIC NOT NULL DEFAULT 0,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (artist_id, criterion)
);

CREATE INDEX idx_wof_stars_artist ON public.artist_walk_of_fame_stars(artist_id);
CREATE INDEX idx_wof_stars_criterion ON public.artist_walk_of_fame_stars(criterion);

CREATE TABLE public.artist_walk_of_fame_votes (
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (artist_id, voter_id)
);

CREATE INDEX idx_wof_votes_artist ON public.artist_walk_of_fame_votes(artist_id);

ALTER TABLE public.artist_walk_of_fame_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_walk_of_fame_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Walk of Fame stars public read" ON public.artist_walk_of_fame_stars FOR SELECT USING (true);
CREATE POLICY "Admin walk of fame stars" ON public.artist_walk_of_fame_stars
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Walk of Fame votes public read" ON public.artist_walk_of_fame_votes FOR SELECT USING (true);
CREATE POLICY "Walk of Fame vote insert" ON public.artist_walk_of_fame_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);
