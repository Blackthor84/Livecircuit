-- Ecosystem M1: AI Tour Planner run history

CREATE TABLE public.artist_tour_planner_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tour_planner_runs_artist ON public.artist_tour_planner_runs(artist_id, created_at DESC);

ALTER TABLE public.artist_tour_planner_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists read own tour planner runs" ON public.artist_tour_planner_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists insert own tour planner runs" ON public.artist_tour_planner_runs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin reads tour planner runs" ON public.artist_tour_planner_runs
  FOR SELECT USING (public.is_admin_profile());
