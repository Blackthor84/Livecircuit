-- Fix tour stop creation: ensure_tour_stop_community trigger was blocked by RLS on tour_stop_communities

CREATE OR REPLACE FUNCTION public.ensure_tour_stop_community()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP POLICY IF EXISTS "Artist manages tour stop communities" ON public.tour_stop_communities;
CREATE POLICY "Artist manages tour stop communities" ON public.tour_stop_communities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.tour_stops ts
      JOIN public.tours t ON t.id = ts.tour_id
      JOIN public.artists a ON a.id = t.artist_id
      WHERE ts.id = tour_stop_communities.tour_stop_id
        AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tour_stops ts
      JOIN public.tours t ON t.id = ts.tour_id
      JOIN public.artists a ON a.id = t.artist_id
      WHERE ts.id = tour_stop_communities.tour_stop_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin manages tour stop communities" ON public.tour_stop_communities;
CREATE POLICY "Admin manages tour stop communities" ON public.tour_stop_communities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Backfill communities for existing stops that have a city but no community row
INSERT INTO public.tour_stop_communities (tour_stop_id, tour_id, city_name, state_code, slug)
SELECT
  ts.id,
  ts.tour_id,
  ts.tour_city,
  ts.tour_state_code,
  lower(regexp_replace(
    coalesce(ts.tour_city, 'stop') || '-fans-' || substr(ts.id::text, 1, 8),
    '[^a-z0-9]+', '-', 'g'
  ))
FROM public.tour_stops ts
WHERE ts.tour_city IS NOT NULL
  AND trim(ts.tour_city) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.tour_stop_communities c WHERE c.tour_stop_id = ts.id
  )
ON CONFLICT (tour_stop_id) DO NOTHING;
