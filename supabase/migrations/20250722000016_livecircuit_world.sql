-- Ecosystem M16: LiveCircuit World (trending regions cache for globe)

CREATE TABLE public.livecircuit_world_trending_regions (
  region_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  country_code TEXT,
  state_code TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  venue_count INTEGER NOT NULL DEFAULT 0,
  live_event_count INTEGER NOT NULL DEFAULT 0,
  attendance_score NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_world_trending_score ON public.livecircuit_world_trending_regions(attendance_score DESC);

CREATE INDEX IF NOT EXISTS idx_cities_lat_lng ON public.cities(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

ALTER TABLE public.livecircuit_world_trending_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "World trending public read" ON public.livecircuit_world_trending_regions FOR SELECT USING (true);
CREATE POLICY "Admin world trending" ON public.livecircuit_world_trending_regions
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
