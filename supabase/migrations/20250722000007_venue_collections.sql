-- Ecosystem M7: Fan Venue Collections

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hall_of_fame BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE public.user_venue_visits (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  visit_count INTEGER NOT NULL DEFAULT 1 CHECK (visit_count >= 1),
  first_visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, venue_id)
);

CREATE INDEX idx_user_venue_visits_user ON public.user_venue_visits(user_id, last_visited_at DESC);

-- Mark sample flagship venues for collection UX
UPDATE public.venues SET is_hall_of_fame = true
WHERE slug IN ('new-york-city-arena', 'los-angeles-arena', 'las-vegas-arena');

UPDATE public.venues SET is_seasonal = true
WHERE slug IN ('boston-arena', 'san-diego-arena');

UPDATE public.venues SET is_hidden = true
WHERE slug IN ('providence-arena', 'albany-arena');

ALTER TABLE public.user_venue_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own venue visits" ON public.user_venue_visits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own venue visits" ON public.user_venue_visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own venue visits" ON public.user_venue_visits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin venue visits" ON public.user_venue_visits
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
