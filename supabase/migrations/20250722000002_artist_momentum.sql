-- Ecosystem M2: Artist Momentum (LiveCircuit Score) daily snapshots

CREATE TABLE public.artist_momentum_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
  trend TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  bucket_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, bucket_date)
);

CREATE INDEX idx_artist_momentum_artist_date
  ON public.artist_momentum_snapshots(artist_id, bucket_date DESC);

ALTER TABLE public.artist_momentum_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read artist momentum" ON public.artist_momentum_snapshots
  FOR SELECT USING (true);

CREATE POLICY "Artists insert own momentum" ON public.artist_momentum_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists update own momentum" ON public.artist_momentum_snapshots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin manages artist momentum" ON public.artist_momentum_snapshots
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
