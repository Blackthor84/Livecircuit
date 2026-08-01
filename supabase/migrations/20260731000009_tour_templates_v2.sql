-- Global tour templates v2: scalable routes, expanded cities, retire NH template

INSERT INTO public.countries (code, name, is_enabled) VALUES
  ('IN', 'India', false),
  ('KR', 'South Korea', false),
  ('SG', 'Singapore', false),
  ('AR', 'Argentina', false),
  ('NG', 'Nigeria', false),
  ('ZA', 'South Africa', false),
  ('EG', 'Egypt', false)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Ensure Midwest & Southern states exist
INSERT INTO public.states (country_id, code, name, is_enabled)
SELECT c.id, v.code, v.name, true FROM public.countries c
CROSS JOIN (VALUES
  ('TN', 'Tennessee'), ('MI', 'Michigan'), ('MN', 'Minnesota'), ('OH', 'Ohio')
) AS v(code, name)
WHERE c.code = 'US'
ON CONFLICT (country_id, code) DO NOTHING;

-- US cities for Southern & Midwest tours
INSERT INTO public.cities (country_id, state_id, name, slug, latitude, longitude, is_enabled)
SELECT c.id, s.id, v.name, v.slug, v.lat, v.lng, true
FROM public.countries c
JOIN (VALUES
  ('Nashville', 'nashville', 'TN', 36.1627, -86.7816),
  ('Houston', 'houston', 'TX', 29.7604, -95.3698),
  ('Austin', 'austin', 'TX', 30.2672, -97.7431),
  ('Detroit', 'detroit', 'MI', 42.3314, -83.0458),
  ('Minneapolis', 'minneapolis', 'MN', 44.9778, -93.2650),
  ('Cleveland', 'cleveland', 'OH', 41.4993, -81.6944)
) AS v(name, slug, state_code, lat, lng) ON true
JOIN public.states s ON s.country_id = c.id AND s.code = v.state_code
WHERE c.code = 'US'
ON CONFLICT (country_id, slug) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- Asia cities
INSERT INTO public.states (country_id, code, name, is_enabled)
SELECT c.id, v.code, v.name, true FROM public.countries c
CROSS JOIN (VALUES
  ('IN', 'India'), ('KR', 'South Korea'), ('SG', 'Singapore')
) AS v(code, name)
WHERE c.code = v.code
ON CONFLICT (country_id, code) DO NOTHING;

INSERT INTO public.cities (country_id, state_id, name, slug, latitude, longitude, is_enabled)
SELECT c.id, s.id, v.name, v.slug, v.lat, v.lng, true
FROM public.countries c
JOIN public.states s ON s.country_id = c.id AND s.code = c.code
JOIN (VALUES
  ('IN', 'Mumbai', 'mumbai', 19.0760, 72.8777),
  ('KR', 'Seoul', 'seoul', 37.5665, 126.9780),
  ('SG', 'Singapore', 'singapore', 1.3521, 103.8198)
) AS v(country_code, name, slug, lat, lng) ON c.code = v.country_code
ON CONFLICT (country_id, slug) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- South America
INSERT INTO public.countries (code, name, is_enabled) VALUES ('AR', 'Argentina', false)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.states (country_id, code, name, is_enabled)
SELECT c.id, 'AR', 'Argentina', true FROM public.countries c WHERE c.code = 'AR'
ON CONFLICT (country_id, code) DO NOTHING;

INSERT INTO public.cities (country_id, state_id, name, slug, latitude, longitude, is_enabled)
SELECT c.id, s.id, v.name, v.slug, v.lat, v.lng, true
FROM public.countries c
JOIN public.states s ON s.country_id = c.id AND s.code = c.code
JOIN (VALUES
  ('BR', 'Rio de Janeiro', 'rio-de-janeiro', -22.9068, -43.1729),
  ('AR', 'Buenos Aires', 'buenos-aires', -34.6037, -58.3816)
) AS v(country_code, name, slug, lat, lng) ON c.code = v.country_code
ON CONFLICT (country_id, slug) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- Africa cities
INSERT INTO public.states (country_id, code, name, is_enabled)
SELECT c.id, v.code, v.name, true FROM public.countries c
CROSS JOIN (VALUES ('NG', 'Nigeria'), ('ZA', 'South Africa'), ('EG', 'Egypt')) AS v(code, name)
WHERE c.code = v.code
ON CONFLICT (country_id, code) DO NOTHING;

INSERT INTO public.cities (country_id, state_id, name, slug, latitude, longitude, is_enabled)
SELECT c.id, s.id, v.name, v.slug, v.lat, v.lng, true
FROM public.countries c
JOIN public.states s ON s.country_id = c.id AND s.code = c.code
JOIN (VALUES
  ('NG', 'Lagos', 'lagos', 6.5244, 3.3792),
  ('ZA', 'Johannesburg', 'johannesburg', -26.2041, 28.0473),
  ('EG', 'Cairo', 'cairo', 30.0444, 31.2357)
) AS v(country_code, name, slug, lat, lng) ON c.code = v.country_code
ON CONFLICT (country_id, slug) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- Retire legacy templates
UPDATE public.tour_templates SET is_active = false
WHERE slug IN ('new-hampshire-tour', 'new-england-tour', 'canada-tour', 'united-kingdom-tour', 'oceania-tour');

-- Insert / update v2 templates
INSERT INTO public.tour_templates (slug, name, tour_type, description, sort_order, config) VALUES
  ('city-tour', 'City Tour', 'city', 'One city, one arena — perfect for a focused show.', 1, '{"defaultTicketPriceCents":1500}'),
  ('multi-city-tour', 'Multi-City Tour', 'regional', 'Three major cities in one weekend route.', 2, '{"defaultTicketPriceCents":1800}'),
  ('state-tour', 'State Tour', 'state', 'Multiple stops across California.', 3, '{"defaultTicketPriceCents":1600}'),
  ('east-coast-tour', 'East Coast Tour', 'regional', 'Boston to Miami along the Atlantic.', 4, '{"defaultTicketPriceCents":2000}'),
  ('west-coast-tour', 'West Coast Tour', 'regional', 'Seattle to San Diego on the Pacific.', 5, '{"defaultTicketPriceCents":2000}'),
  ('southern-tour', 'Southern Tour', 'regional', 'Atlanta to Miami through the Sun Belt.', 6, '{"defaultTicketPriceCents":1900}'),
  ('midwest-tour', 'Midwest Tour', 'regional', 'Chicago to Denver through the heartland.', 7, '{"defaultTicketPriceCents":1900}'),
  ('usa-tour', 'USA Tour', 'national', 'Coast-to-coast national digital route.', 8, '{"defaultTicketPriceCents":2500}'),
  ('north-america-tour', 'North America Tour', 'continental', 'USA and Canada combined.', 9, '{"defaultTicketPriceCents":3000}'),
  ('europe-tour', 'Europe Tour', 'continental', 'London, Paris, Berlin, Amsterdam.', 10, '{"defaultTicketPriceCents":2800}'),
  ('asia-tour', 'Asia Tour', 'continental', 'Tokyo, Singapore, Mumbai, Seoul.', 11, '{"defaultTicketPriceCents":2800}'),
  ('australia-new-zealand-tour', 'Australia & New Zealand Tour', 'continental', 'Sydney to Wellington.', 12, '{"defaultTicketPriceCents":2400}'),
  ('south-america-tour', 'South America Tour', 'continental', 'São Paulo, Rio, Buenos Aires.', 13, '{"defaultTicketPriceCents":2600}'),
  ('africa-tour', 'Africa Tour', 'continental', 'Lagos, Johannesburg, Cairo.', 14, '{"defaultTicketPriceCents":2600}'),
  ('world-tour', 'World Tour', 'world', 'Six continents in one global route.', 15, '{"defaultTicketPriceCents":3500}')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tour_type = EXCLUDED.tour_type,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  config = EXCLUDED.config,
  is_active = true;
