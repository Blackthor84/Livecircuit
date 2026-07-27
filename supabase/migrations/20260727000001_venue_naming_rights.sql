-- Venue naming rights: permanent slug, changeable public display names

CREATE TYPE public.venue_sponsorship_status AS ENUM (
  'available',
  'pending',
  'active',
  'expired'
);

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS default_name TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS sponsored_name TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_company TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_start_date DATE,
  ADD COLUMN IF NOT EXISTS sponsor_end_date DATE,
  ADD COLUMN IF NOT EXISTS sponsorship_status public.venue_sponsorship_status NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS naming_rights_price INTEGER,
  ADD COLUMN IF NOT EXISTS is_placeholder_name BOOLEAN NOT NULL DEFAULT true;

-- Backfill from legacy name column
UPDATE public.venues
SET
  default_name = COALESCE(default_name, name),
  display_name = COALESCE(display_name, name),
  is_placeholder_name = COALESCE(is_placeholder_name, true)
WHERE default_name IS NULL OR display_name IS NULL;

-- Sync active founding sponsor naming rights onto venue row
UPDATE public.venues v
SET
  sponsored_name = vs.display_name,
  sponsor_company = so.name,
  sponsor_logo_url = so.logo_url,
  sponsor_start_date = vs.contract_starts_at::date,
  sponsor_end_date = vs.contract_ends_at::date,
  naming_rights_price = COALESCE(v.naming_rights_price, vs.launch_pricing_cents),
  sponsorship_status = CASE
    WHEN vs.contract_ends_at IS NOT NULL AND vs.contract_ends_at::date < CURRENT_DATE THEN 'expired'::public.venue_sponsorship_status
    ELSE 'active'::public.venue_sponsorship_status
  END,
  is_placeholder_name = false
FROM public.venue_sponsorships vs
JOIN public.sponsor_organizations so ON so.id = vs.organization_id
WHERE vs.venue_id = v.id
  AND vs.is_founding_sponsor = true
  AND vs.is_active = true
  AND vs.display_name IS NOT NULL
  AND trim(vs.display_name) <> '';

CREATE OR REPLACE FUNCTION public.sync_venue_display_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.display_name := COALESCE(NULLIF(trim(NEW.sponsored_name), ''), NEW.default_name);
  NEW.name := NEW.display_name;

  IF NULLIF(trim(NEW.sponsored_name), '') IS NOT NULL THEN
    IF NEW.sponsor_end_date IS NOT NULL AND NEW.sponsor_end_date < CURRENT_DATE THEN
      NEW.sponsorship_status := 'expired';
    ELSIF NEW.sponsorship_status = 'pending' THEN
      NEW.sponsorship_status := 'pending';
    ELSE
      NEW.sponsorship_status := 'active';
    END IF;
  ELSE
    NEW.sponsorship_status := 'available';
    NEW.sponsor_company := NULL;
    NEW.sponsor_logo_url := NULL;
    NEW.sponsor_start_date := NULL;
    NEW.sponsor_end_date := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venues_sync_display_name ON public.venues;
CREATE TRIGGER venues_sync_display_name
  BEFORE INSERT OR UPDATE OF default_name, sponsored_name, sponsor_company, sponsor_logo_url,
    sponsor_start_date, sponsor_end_date, sponsorship_status
  ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_venue_display_name();

-- Placeholder names for existing flagship venues (slug never changes)
UPDATE public.venues SET default_name = 'New York City Stadium Arena', naming_rights_price = 25000000 WHERE slug = 'new-york-city-arena';
UPDATE public.venues SET default_name = 'Buffalo Community Arena', naming_rights_price = 3500000 WHERE slug = 'buffalo-arena';
UPDATE public.venues SET default_name = 'Albany Club Arena', naming_rights_price = 3200000 WHERE slug = 'albany-arena';
UPDATE public.venues SET default_name = 'Boston Grand Arena', naming_rights_price = 8500000 WHERE slug = 'boston-arena';
UPDATE public.venues SET default_name = 'Providence Theater Arena', naming_rights_price = 2800000 WHERE slug = 'providence-arena';
UPDATE public.venues SET default_name = 'Los Angeles Stadium Arena', naming_rights_price = 22000000 WHERE slug = 'los-angeles-arena';
UPDATE public.venues SET default_name = 'San Diego Community Arena', naming_rights_price = 4200000 WHERE slug = 'san-diego-arena';
UPDATE public.venues SET default_name = 'Dallas Grand Arena', naming_rights_price = 7800000 WHERE slug = 'dallas-arena';
UPDATE public.venues SET default_name = 'Miami Club Arena', naming_rights_price = 6500000 WHERE slug = 'miami-arena';
UPDATE public.venues SET default_name = 'Seattle Theater Arena', naming_rights_price = 5200000 WHERE slug = 'seattle-arena';
UPDATE public.venues SET default_name = 'Las Vegas Stadium Arena', naming_rights_price = 18000000 WHERE slug = 'las-vegas-arena';
UPDATE public.venues SET default_name = 'London Grand Arena', naming_rights_price = 12000000 WHERE slug = 'london-arena';
UPDATE public.venues SET default_name = 'Paris Community Arena', naming_rights_price = 6800000 WHERE slug = 'paris-arena';
UPDATE public.venues SET default_name = 'Tokyo Grand Arena', naming_rights_price = 9500000 WHERE slug = 'tokyo-arena';
UPDATE public.venues SET default_name = 'Sydney Stadium Arena', naming_rights_price = 8800000 WHERE slug = 'sydney-arena';

-- Re-run display sync for updated default names
UPDATE public.venues
SET default_name = default_name;

-- Seed additional placeholder venues per city (5-tier naming convention)
INSERT INTO public.venues (
  slug, name, default_name, display_name, region, state_code, venue_type_id, capacity, description,
  naming_rights_price, is_placeholder_name, sponsorship_status
)
SELECT
  v.slug,
  v.default_name,
  v.default_name,
  v.default_name,
  v.region,
  v.state_code,
  vt.id,
  v.capacity,
  v.description,
  v.naming_rights_price,
  true,
  'available'::public.venue_sponsorship_status
FROM (VALUES
  ('new-hampshire-community-arena', 'New Hampshire Community Arena', 'Manchester', 'NH', 12000, 'Community venue for New Hampshire performers and fans.', 2800000),
  ('new-hampshire-club-arena', 'New Hampshire Club Arena', 'Manchester', 'NH', 8500, 'Intimate club-scale arena serving the Granite State.', 2200000),
  ('new-hampshire-theater-arena', 'New Hampshire Theater Arena', 'Manchester', 'NH', 6500, 'Theater-format arena for comedy, speakers, and live arts.', 2600000),
  ('new-hampshire-grand-arena', 'New Hampshire Grand Arena', 'Manchester', 'NH', 18000, 'Mid-size grand arena for regional tours.', 4800000),
  ('new-hampshire-stadium-arena', 'New Hampshire Stadium Arena', 'Manchester', 'NH', 42000, 'Flagship stadium arena for New Hampshire.', 12000000),

  ('boston-community-arena', 'Boston Community Arena', 'Boston', 'MA', 11000, 'Community arena for emerging Boston artists.', 3200000),
  ('boston-club-arena', 'Boston Club Arena', 'Boston', 'MA', 7500, 'Club-scale Boston venue for nightly performances.', 2800000),
  ('boston-theater-arena', 'Boston Theater Arena', 'Boston', 'MA', 6200, 'Theater arena for comedy and spoken word.', 3000000),
  ('boston-stadium-arena', 'Boston Stadium Arena', 'Boston', 'MA', 48000, 'Stadium-scale Boston flagship venue.', 15000000),

  ('new-york-city-community-arena', 'New York City Community Arena', 'New York City', 'NY', 14000, 'Community arena serving all five boroughs.', 4500000),
  ('new-york-city-club-arena', 'New York City Club Arena', 'New York City', 'NY', 9000, 'Club arena in the heart of NYC.', 3800000),
  ('new-york-city-theater-arena', 'New York City Theater Arena', 'New York City', 'NY', 8000, 'Theater arena for Broadway-adjacent live entertainment.', 4200000),
  ('new-york-city-grand-arena', 'New York City Grand Arena', 'New York City', 'NY', 35000, 'Grand arena for major NYC tours.', 18000000),

  ('los-angeles-community-arena', 'Los Angeles Community Arena', 'Los Angeles', 'CA', 13000, 'Community arena for LA creators.', 4000000),
  ('los-angeles-club-arena', 'Los Angeles Club Arena', 'Los Angeles', 'CA', 8500, 'Club arena on the west coast circuit.', 3500000),
  ('los-angeles-theater-arena', 'Los Angeles Theater Arena', 'Los Angeles', 'CA', 7000, 'Theater arena for film, comedy, and culture.', 3800000),
  ('los-angeles-grand-arena', 'Los Angeles Grand Arena', 'Los Angeles', 'CA', 32000, 'Grand arena for major LA residencies.', 16000000),

  ('dallas-community-arena', 'Dallas Community Arena', 'Dallas', 'TX', 12000, 'Community arena for Texas performers.', 3200000),
  ('dallas-club-arena', 'Dallas Club Arena', 'Dallas', 'TX', 8000, 'Club arena in the Dallas metro.', 2800000),
  ('dallas-theater-arena', 'Dallas Theater Arena', 'Dallas', 'TX', 6500, 'Theater arena for live arts and comedy.', 3000000),
  ('dallas-stadium-arena', 'Dallas Stadium Arena', 'Dallas', 'TX', 45000, 'Stadium arena for major Texas events.', 14000000),

  ('miami-community-arena', 'Miami Community Arena', 'Miami', 'FL', 11000, 'Community arena for South Florida artists.', 3400000),
  ('miami-theater-arena', 'Miami Theater Arena', 'Miami', 'FL', 6800, 'Theater arena for Miami live culture.', 3100000),
  ('miami-grand-arena', 'Miami Grand Arena', 'Miami', 'FL', 28000, 'Grand arena for Miami festival programming.', 11000000),
  ('miami-stadium-arena', 'Miami Stadium Arena', 'Miami', 'FL', 42000, 'Stadium arena for major Miami events.', 13500000),

  ('seattle-community-arena', 'Seattle Community Arena', 'Seattle', 'WA', 10500, 'Community arena for Pacific Northwest creators.', 3100000),
  ('seattle-club-arena', 'Seattle Club Arena', 'Seattle', 'WA', 7200, 'Club arena for Seattle nightlife.', 2700000),
  ('seattle-grand-arena', 'Seattle Grand Arena', 'Seattle', 'WA', 26000, 'Grand arena for Seattle touring acts.', 9800000),
  ('seattle-stadium-arena', 'Seattle Stadium Arena', 'Seattle', 'WA', 40000, 'Stadium arena for major PNW events.', 12500000)
) AS v(slug, default_name, region, state_code, capacity, description, naming_rights_price)
JOIN public.venue_types vt ON vt.slug = 'arena'
ON CONFLICT (slug) DO NOTHING;

-- Default billboards for newly seeded venues
INSERT INTO public.venue_billboards (venue_id, location_type_id, slug, label, zone_key)
SELECT ven.id, blt.id, 'homepage-hero', 'Homepage Hero Billboard', 'homepage'
FROM public.venues ven
CROSS JOIN public.billboard_location_types blt
WHERE blt.slug = 'homepage'
  AND NOT EXISTS (
    SELECT 1 FROM public.venue_billboards vb
    WHERE vb.venue_id = ven.id AND vb.slug = 'homepage-hero'
  )
ON CONFLICT (venue_id, slug) DO NOTHING;

INSERT INTO public.venue_billboards (venue_id, location_type_id, slug, label, zone_key)
SELECT ven.id, blt.id, 'concourse-main', 'Main Concourse Billboard', 'concourse'
FROM public.venues ven
CROSS JOIN public.billboard_location_types blt
WHERE blt.slug = 'concourse'
  AND NOT EXISTS (
    SELECT 1 FROM public.venue_billboards vb
    WHERE vb.venue_id = ven.id AND vb.slug = 'concourse-main'
  )
ON CONFLICT (venue_id, slug) DO NOTHING;

ALTER TABLE public.venues
  ALTER COLUMN default_name SET NOT NULL,
  ALTER COLUMN display_name SET NOT NULL;
