-- Milestone 4: assign tour stops to virtual venues (syncs to events)

ALTER TABLE public.tour_stops
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

ALTER TABLE public.tour_stops
  ADD COLUMN IF NOT EXISTS venue_room_label TEXT;

CREATE INDEX IF NOT EXISTS idx_tour_stops_venue ON public.tour_stops(venue_id)
  WHERE venue_id IS NOT NULL;

COMMENT ON COLUMN public.tour_stops.venue_room_label IS
  'Logical room within a venue; copied to events.venue_room_label for simultaneous shows.';
