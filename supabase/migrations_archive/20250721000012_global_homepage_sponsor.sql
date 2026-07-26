-- Milestone 6: global homepage sponsorship placement

INSERT INTO public.venue_billboards (venue_id, location_type_id, slug, label, zone_key)
SELECT NULL, blt.id, 'platform-homepage', 'LiveCircuit Homepage Hero', 'homepage'
FROM public.billboard_location_types blt
WHERE blt.slug = 'homepage'
  AND NOT EXISTS (
    SELECT 1 FROM public.venue_billboards vb
    WHERE vb.venue_id IS NULL AND vb.slug = 'platform-homepage'
  );
