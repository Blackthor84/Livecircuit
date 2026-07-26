-- Ecosystem M13: Venue Hall of Fame (per-venue legend categories)

CREATE TYPE public.venue_hof_category AS ENUM (
  'top_attendance',
  'top_revenue',
  'most_viewed',
  'highest_rated',
  'most_tips',
  'most_merchandise',
  'longest_running_show',
  'fan_favorite',
  'most_loyal_fans'
);

CREATE TYPE public.venue_hof_holder_type AS ENUM ('artist', 'event', 'fan');

CREATE TABLE public.venue_hall_of_fame_entries (
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  category public.venue_hof_category NOT NULL,
  rank INTEGER NOT NULL DEFAULT 1 CHECK (rank >= 1 AND rank <= 3),
  holder_type public.venue_hof_holder_type NOT NULL,
  holder_id UUID,
  display_name TEXT NOT NULL,
  subtitle TEXT,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  metric_label TEXT NOT NULL,
  link_href TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, category, rank)
);

CREATE INDEX idx_venue_hof_venue ON public.venue_hall_of_fame_entries(venue_id, category);

ALTER TABLE public.venue_hall_of_fame_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue HOF public read" ON public.venue_hall_of_fame_entries FOR SELECT USING (true);
CREATE POLICY "Admin venue HOF" ON public.venue_hall_of_fame_entries
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
