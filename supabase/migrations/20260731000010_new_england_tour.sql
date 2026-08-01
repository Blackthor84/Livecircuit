-- New England tour: Hartford & New Haven cities, reactivate template

INSERT INTO public.cities (country_id, state_id, name, slug, latitude, longitude, is_enabled)
SELECT c.id, s.id, v.name, v.slug, v.lat, v.lng, true
FROM public.countries c
JOIN (VALUES
  ('Hartford', 'hartford', 'CT', 41.7658, -72.6734),
  ('New Haven', 'new-haven', 'CT', 41.3083, -72.9279)
) AS v(name, slug, state_code, lat, lng) ON true
JOIN public.states s ON s.country_id = c.id AND s.code = v.state_code
WHERE c.code = 'US'
ON CONFLICT (country_id, slug) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

INSERT INTO public.tour_templates (slug, name, tour_type, description, sort_order, config, is_active) VALUES
  ('new-england-tour', 'New England Tour', 'regional', 'Boston to Burlington — seven classic New England cities.', 4, '{"defaultTicketPriceCents":1800}', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tour_type = EXCLUDED.tour_type,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  config = EXCLUDED.config,
  is_active = true;
