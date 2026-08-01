-- Global touring: tour types, templates, geo enablement, launch region seeds

CREATE TYPE public.tour_type AS ENUM (
  'city',
  'state',
  'regional',
  'national',
  'continental',
  'world'
);

ALTER TABLE public.countries
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.states
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS tour_type public.tour_type DEFAULT 'regional',
  ADD COLUMN IF NOT EXISTS template_slug TEXT;

CREATE TABLE IF NOT EXISTS public.tour_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tour_type public.tour_type NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_templates_active ON public.tour_templates(is_active, sort_order);

ALTER TABLE public.tour_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tour templates" ON public.tour_templates FOR SELECT USING (is_active = true);

CREATE POLICY "Admin update countries" ON public.countries
  FOR UPDATE USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- Launch + future countries
INSERT INTO public.countries (code, name, is_enabled) VALUES
  ('US', 'United States', true),
  ('CA', 'Canada', true),
  ('GB', 'United Kingdom', true),
  ('AU', 'Australia', true),
  ('NZ', 'New Zealand', true),
  ('FR', 'France', false),
  ('DE', 'Germany', false),
  ('NL', 'Netherlands', false),
  ('JP', 'Japan', false),
  ('BR', 'Brazil', false)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

UPDATE public.countries SET is_enabled = true WHERE code IN ('US', 'CA', 'GB', 'AU', 'NZ');

-- US states (50 + DC)
INSERT INTO public.states (country_id, code, name, is_enabled)
SELECT c.id, v.code, v.name, true
FROM public.countries c
CROSS JOIN (VALUES
  ('AL', 'Alabama'), ('AK', 'Alaska'), ('AZ', 'Arizona'), ('AR', 'Arkansas'),
  ('CA', 'California'), ('CO', 'Colorado'), ('CT', 'Connecticut'), ('DE', 'Delaware'),
  ('FL', 'Florida'), ('GA', 'Georgia'), ('HI', 'Hawaii'), ('ID', 'Idaho'),
  ('IL', 'Illinois'), ('IN', 'Indiana'), ('IA', 'Iowa'), ('KS', 'Kansas'),
  ('KY', 'Kentucky'), ('LA', 'Louisiana'), ('ME', 'Maine'), ('MD', 'Maryland'),
  ('MA', 'Massachusetts'), ('MI', 'Michigan'), ('MN', 'Minnesota'), ('MS', 'Mississippi'),
  ('MO', 'Missouri'), ('MT', 'Montana'), ('NE', 'Nebraska'), ('NV', 'Nevada'),
  ('NH', 'New Hampshire'), ('NJ', 'New Jersey'), ('NM', 'New Mexico'), ('NY', 'New York'),
  ('NC', 'North Carolina'), ('ND', 'North Dakota'), ('OH', 'Ohio'), ('OK', 'Oklahoma'),
  ('OR', 'Oregon'), ('PA', 'Pennsylvania'), ('RI', 'Rhode Island'), ('SC', 'South Carolina'),
  ('SD', 'South Dakota'), ('TN', 'Tennessee'), ('TX', 'Texas'), ('UT', 'Utah'),
  ('VT', 'Vermont'), ('VA', 'Virginia'), ('WA', 'Washington'), ('WV', 'West Virginia'),
  ('WI', 'Wisconsin'), ('WY', 'Wyoming'), ('DC', 'District of Columbia')
) AS v(code, name)
WHERE c.code = 'US'
ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name;

-- Canadian provinces
INSERT INTO public.states (country_id, code, name, is_enabled)
SELECT c.id, v.code, v.name, true FROM public.countries c
CROSS JOIN (VALUES
  ('ON', 'Ontario'), ('BC', 'British Columbia'), ('QC', 'Quebec'), ('AB', 'Alberta'),
  ('MB', 'Manitoba'), ('NS', 'Nova Scotia'), ('SK', 'Saskatchewan'), ('NB', 'New Brunswick')
) AS v(code, name)
WHERE c.code = 'CA'
ON CONFLICT (country_id, code) DO NOTHING;

-- UK nations
INSERT INTO public.states (country_id, code, name, is_enabled)
SELECT c.id, v.code, v.name, true FROM public.countries c
CROSS JOIN (VALUES
  ('ENG', 'England'), ('SCT', 'Scotland'), ('WLS', 'Wales'), ('NIR', 'Northern Ireland')
) AS v(code, name)
WHERE c.code = 'GB'
ON CONFLICT (country_id, code) DO NOTHING;

-- Australian states
INSERT INTO public.states (country_id, code, name, is_enabled)
SELECT c.id, v.code, v.name, true FROM public.countries c
CROSS JOIN (VALUES
  ('NSW', 'New South Wales'), ('VIC', 'Victoria'), ('QLD', 'Queensland'),
  ('WA', 'Western Australia'), ('SA', 'South Australia'), ('TAS', 'Tasmania'), ('ACT', 'Australian Capital Territory')
) AS v(code, name)
WHERE c.code = 'AU'
ON CONFLICT (country_id, code) DO NOTHING;

-- NZ regions
INSERT INTO public.states (country_id, code, name, is_enabled)
SELECT c.id, 'NZ', 'New Zealand', true FROM public.countries c WHERE c.code = 'NZ'
ON CONFLICT (country_id, code) DO NOTHING;

-- US cities (tour template routes)
INSERT INTO public.cities (country_id, state_id, name, slug, latitude, longitude, is_enabled)
SELECT c.id, s.id, v.name, v.slug, v.lat, v.lng, true
FROM public.countries c
JOIN (VALUES
  ('Los Angeles', 'los-angeles', 'CA', 34.0522, -118.2437),
  ('Boston', 'boston', 'MA', 42.3601, -71.0589),
  ('New York', 'new-york', 'NY', 40.7128, -74.0060),
  ('Chicago', 'chicago', 'IL', 41.8781, -87.6298),
  ('Dallas', 'dallas', 'TX', 32.7767, -96.7970),
  ('Miami', 'miami', 'FL', 25.7617, -80.1918),
  ('Providence', 'providence', 'RI', 41.8240, -71.4128),
  ('Manchester', 'manchester-nh', 'NH', 42.9956, -71.4548),
  ('Nashua', 'nashua', 'NH', 42.7654, -71.4676),
  ('Concord', 'concord-nh', 'NH', 43.2081, -71.5376),
  ('Portsmouth', 'portsmouth-nh', 'NH', 43.0718, -70.7626),
  ('Portland', 'portland-me', 'ME', 43.6591, -70.2568),
  ('Burlington', 'burlington', 'VT', 44.4759, -73.2121),
  ('Philadelphia', 'philadelphia', 'PA', 39.9526, -75.1652),
  ('Washington', 'washington-dc', 'DC', 38.9072, -77.0369),
  ('Atlanta', 'atlanta', 'GA', 33.7490, -84.3880),
  ('Seattle', 'seattle', 'WA', 47.6062, -122.3321),
  ('Portland', 'portland-or', 'OR', 45.5152, -122.6784),
  ('San Francisco', 'san-francisco', 'CA', 37.7749, -122.4194),
  ('San Diego', 'san-diego', 'CA', 32.7157, -117.1611),
  ('Denver', 'denver', 'CO', 39.7392, -104.9903)
) AS v(name, slug, state_code, lat, lng) ON true
JOIN public.states s ON s.country_id = c.id AND s.code = v.state_code
WHERE c.code = 'US'
ON CONFLICT (country_id, slug) DO UPDATE SET
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  name = EXCLUDED.name;

-- Canada cities
INSERT INTO public.cities (country_id, state_id, name, slug, latitude, longitude, is_enabled)
SELECT c.id, s.id, v.name, v.slug, v.lat, v.lng, true
FROM public.countries c
JOIN (VALUES
  ('Toronto', 'toronto', 'ON', 43.6532, -79.3832),
  ('Montreal', 'montreal', 'QC', 45.5017, -73.5673),
  ('Ottawa', 'ottawa', 'ON', 45.4215, -75.6972),
  ('Calgary', 'calgary', 'AB', 51.0447, -114.0719),
  ('Vancouver', 'vancouver', 'BC', 49.2827, -123.1207)
) AS v(name, slug, state_code, lat, lng) ON true
JOIN public.states s ON s.country_id = c.id AND s.code = v.state_code
WHERE c.code = 'CA'
ON CONFLICT (country_id, slug) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- UK cities
INSERT INTO public.cities (country_id, state_id, name, slug, latitude, longitude, is_enabled)
SELECT c.id, s.id, v.name, v.slug, v.lat, v.lng, true
FROM public.countries c
JOIN (VALUES
  ('London', 'london', 'ENG', 51.5074, -0.1278),
  ('Manchester', 'manchester', 'ENG', 53.4808, -2.2426),
  ('Birmingham', 'birmingham', 'ENG', 52.4862, -1.8904),
  ('Edinburgh', 'edinburgh', 'SCT', 55.9533, -3.1883)
) AS v(name, slug, state_code, lat, lng) ON true
JOIN public.states s ON s.country_id = c.id AND s.code = v.state_code
WHERE c.code = 'GB'
ON CONFLICT (country_id, slug) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- Australia cities
INSERT INTO public.cities (country_id, state_id, name, slug, latitude, longitude, is_enabled)
SELECT c.id, s.id, v.name, v.slug, v.lat, v.lng, true
FROM public.countries c
JOIN (VALUES
  ('Sydney', 'sydney', 'NSW', -33.8688, 151.2093),
  ('Melbourne', 'melbourne', 'VIC', -37.8136, 144.9631)
) AS v(name, slug, state_code, lat, lng) ON true
JOIN public.states s ON s.country_id = c.id AND s.code = v.state_code
WHERE c.code = 'AU'
ON CONFLICT (country_id, slug) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- New Zealand cities
INSERT INTO public.cities (country_id, state_id, name, slug, latitude, longitude, is_enabled)
SELECT c.id, s.id, v.name, v.slug, v.lat, v.lng, true
FROM public.countries c
JOIN public.states s ON s.country_id = c.id AND s.code = 'NZ'
JOIN (VALUES
  ('Auckland', 'auckland', -36.8485, 174.7633),
  ('Wellington', 'wellington', -41.2865, 174.7762)
) AS v(name, slug, lat, lng) ON true
WHERE c.code = 'NZ'
ON CONFLICT (country_id, slug) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- Future countries (disabled until admin enables)
INSERT INTO public.states (country_id, code, name, is_enabled)
SELECT c.id, v.code, v.name, true FROM public.countries c
CROSS JOIN (VALUES ('FR', 'France'), ('DE', 'Germany'), ('NL', 'Netherlands'), ('JP', 'Japan'), ('BR', 'Brazil')) AS v(code, name)
WHERE c.code = v.code
ON CONFLICT (country_id, code) DO NOTHING;

INSERT INTO public.cities (country_id, state_id, name, slug, latitude, longitude, is_enabled)
SELECT c.id, s.id, v.name, v.slug, v.lat, v.lng, true
FROM public.countries c
JOIN public.states s ON s.country_id = c.id AND s.code = c.code
JOIN (VALUES
  ('FR', 'Paris', 'paris', 48.8566, 2.3522),
  ('DE', 'Berlin', 'berlin', 52.5200, 13.4050),
  ('NL', 'Amsterdam', 'amsterdam', 52.3676, 4.9041),
  ('JP', 'Tokyo', 'tokyo', 35.6762, 139.6503),
  ('BR', 'São Paulo', 'sao-paulo', -23.5505, -46.6333)
) AS v(country_code, name, slug, lat, lng) ON c.code = v.country_code
ON CONFLICT (country_id, slug) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- Tour templates (config mirrors src/lib/touring/tour-templates.ts)
INSERT INTO public.tour_templates (slug, name, tour_type, description, sort_order, config) VALUES
  ('new-hampshire-tour', 'New Hampshire Tour', 'state', 'Single-state route across New Hampshire cities.', 1, '{"defaultTicketPriceCents":1500}'),
  ('new-england-tour', 'New England Tour', 'regional', 'Boston to Providence, Manchester, and Portland.', 2, '{"defaultTicketPriceCents":1800}'),
  ('east-coast-tour', 'East Coast Tour', 'regional', 'Major cities from Boston to Miami.', 3, '{"defaultTicketPriceCents":2000}'),
  ('west-coast-tour', 'West Coast Tour', 'regional', 'Seattle to San Diego along the Pacific corridor.', 4, '{"defaultTicketPriceCents":2000}'),
  ('usa-tour', 'USA Tour', 'national', 'Coast-to-coast national digital route.', 5, '{"defaultTicketPriceCents":2500}'),
  ('canada-tour', 'Canada Tour', 'national', 'Toronto to Vancouver — major Canadian cities.', 6, '{"defaultTicketPriceCents":2200}'),
  ('united-kingdom-tour', 'United Kingdom Tour', 'national', 'London, Manchester, Birmingham, and Edinburgh.', 7, '{"defaultTicketPriceCents":2200}'),
  ('europe-tour', 'Europe Tour', 'continental', 'London, Paris, Berlin, and Amsterdam.', 8, '{"defaultTicketPriceCents":2800}'),
  ('oceania-tour', 'Oceania Tour', 'continental', 'Sydney, Melbourne, Auckland, and Wellington.', 9, '{"defaultTicketPriceCents":2400}'),
  ('north-america-tour', 'North America Tour', 'continental', 'USA and Canada combined route.', 10, '{"defaultTicketPriceCents":3000}'),
  ('world-tour', 'World Tour', 'world', 'Six continents of digital stops in one route.', 11, '{"defaultTicketPriceCents":3500}')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tour_type = EXCLUDED.tour_type,
  description = EXCLUDED.description,
  config = EXCLUDED.config;

CREATE TRIGGER set_updated_at_tour_templates
  BEFORE UPDATE ON public.tour_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
