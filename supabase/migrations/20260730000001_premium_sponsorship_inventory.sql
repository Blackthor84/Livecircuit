-- Premium sponsorship inventory: exclusive slots, extensible catalog, recurring revenue

CREATE TYPE public.sponsorship_contract_status AS ENUM (
  'available',
  'pending',
  'active',
  'expired',
  'cancelled'
);

CREATE TYPE public.sponsorship_slot_scope AS ENUM (
  'venue',
  'event',
  'tour',
  'platform',
  'featured_stage'
);

-- Extensible catalog — add new sponsorship types via INSERT, no schema change
CREATE TABLE IF NOT EXISTS public.sponsorship_slot_types (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  scope public.sponsorship_slot_scope NOT NULL,
  max_per_entity INTEGER NOT NULL DEFAULT 1,
  tier INTEGER NOT NULL DEFAULT 0,
  list_price_cents INTEGER,
  is_exclusive BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.premium_sponsorship_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_type_slug TEXT NOT NULL REFERENCES public.sponsorship_slot_types(slug),
  organization_id UUID REFERENCES public.sponsor_organizations(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
  featured_stage_id UUID,
  display_label TEXT NOT NULL,
  logo_url TEXT,
  contract_value_cents INTEGER NOT NULL DEFAULT 0,
  contract_starts_at DATE,
  contract_ends_at DATE,
  status public.sponsorship_contract_status NOT NULL DEFAULT 'pending',
  renewal_reminder_at DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_premium_contracts_venue ON public.premium_sponsorship_contracts(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_premium_contracts_event ON public.premium_sponsorship_contracts(event_id, status);
CREATE INDEX IF NOT EXISTS idx_premium_contracts_tour ON public.premium_sponsorship_contracts(tour_id, status);
CREATE INDEX IF NOT EXISTS idx_premium_contracts_org ON public.premium_sponsorship_contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_premium_contracts_status ON public.premium_sponsorship_contracts(status, contract_ends_at);

-- Exclusivity: one active/pending contract per slot per entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_one_venue_slot
  ON public.premium_sponsorship_contracts(slot_type_slug, venue_id)
  WHERE venue_id IS NOT NULL AND status IN ('active', 'pending');

CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_one_event_slot
  ON public.premium_sponsorship_contracts(slot_type_slug, event_id)
  WHERE event_id IS NOT NULL AND status IN ('active', 'pending');

CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_one_tour_slot
  ON public.premium_sponsorship_contracts(slot_type_slug, tour_id)
  WHERE tour_id IS NOT NULL AND status IN ('active', 'pending');

CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_one_platform_slot
  ON public.premium_sponsorship_contracts(slot_type_slug)
  WHERE venue_id IS NULL AND event_id IS NULL AND tour_id IS NULL AND featured_stage_id IS NULL
    AND status IN ('active', 'pending');

-- Featured stages: limited premium placements (not unlimited artist stages)
CREATE TABLE IF NOT EXISTS public.featured_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  stage_name TEXT NOT NULL,
  description TEXT,
  sponsor_label TEXT,
  sponsor_logo_url TEXT,
  sponsor_contract_id UUID REFERENCES public.premium_sponsorship_contracts(id) ON DELETE SET NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  homepage_priority INTEGER NOT NULL DEFAULT 0,
  search_boost INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_sponsorship_contracts
  ADD CONSTRAINT premium_contracts_featured_stage_fkey
  FOREIGN KEY (featured_stage_id) REFERENCES public.featured_stages(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_one_featured_stage_slot
  ON public.premium_sponsorship_contracts(slot_type_slug, featured_stage_id)
  WHERE featured_stage_id IS NOT NULL AND status IN ('active', 'pending');

-- Seed premium inventory types
INSERT INTO public.sponsorship_slot_types (slug, name, description, scope, max_per_entity, tier, list_price_cents, sort_order) VALUES
  ('arena_naming_rights', 'Arena Naming Rights', 'One exclusive naming rights sponsor per venue. Most valuable inventory.', 'venue', 1, 100, NULL, 1),
  ('official_arena_partner', 'Official Arena Partner', 'One official partner displayed on the venue page.', 'venue', 1, 90, 2500000, 2),
  ('vip_lounge', 'VIP Lounge Sponsor', 'One exclusive VIP lounge naming sponsor.', 'venue', 1, 80, 1500000, 3),
  ('artist_green_room', 'Artist Green Room Sponsor', 'One green room / artist lounge sponsor.', 'venue', 1, 75, 800000, 4),
  ('fan_zone', 'Fan Zone Sponsor', 'One fan zone activation sponsor.', 'venue', 1, 70, 600000, 5),
  ('wifi', 'WiFi Sponsor', 'One subtle WiFi sponsor per venue.', 'venue', 1, 50, 350000, 6),
  ('livestream', 'Livestream Sponsor', 'One sponsor per live event — presented during the stream.', 'event', 1, 85, 500000, 10),
  ('event_sponsor', 'Event Sponsor', 'One sponsor per individual event.', 'event', 1, 65, 250000, 11),
  ('replay', 'Replay Sponsor', 'Shown only during replay viewing.', 'event', 1, 55, 150000, 12),
  ('tour_sponsor', 'Tour Sponsor', 'One sponsor per tour — Summer Tour presented by…', 'tour', 1, 95, 5000000, 20),
  ('festival_sponsor', 'Festival Sponsor', 'One sponsor for multi-day festival programming.', 'tour', 1, 88, 3000000, 21),
  ('featured_stage', 'Featured Stage', 'Limited homepage featured stage placement.', 'featured_stage', 1, 72, 400000, 30),
  ('platform_official_airline', 'Official Airline', 'Platform-wide official airline partner.', 'platform', 1, 60, 10000000, 40),
  ('platform_official_audio', 'Official Audio Partner', 'Platform-wide audio partner.', 'platform', 1, 58, 8000000, 41),
  ('platform_official_camera', 'Official Camera Partner', 'Platform-wide camera partner.', 'platform', 1, 57, 6000000, 42),
  ('platform_official_streaming', 'Official Streaming Partner', 'Platform-wide streaming partner.', 'platform', 1, 59, 12000000, 43),
  ('platform_official_beverage', 'Official Beverage', 'Platform-wide beverage partner.', 'platform', 1, 56, 5000000, 44),
  ('platform_official_vehicle', 'Official Vehicle', 'Platform-wide vehicle partner.', 'platform', 1, 55, 7000000, 45),
  ('platform_official_clothing', 'Official Clothing', 'Platform-wide apparel partner.', 'platform', 1, 54, 4000000, 46)
ON CONFLICT (slug) DO NOTHING;

-- Seed limited featured stage slots (scarcity)
INSERT INTO public.featured_stages (slug, stage_name, description, homepage_priority, search_boost) VALUES
  ('fender-featured-stage', 'Fender Featured Stage', 'Premium guitar-forward discovery placement.', 100, 50),
  ('jbl-featured-stage', 'JBL Featured Stage', 'Premium audio-forward featured placement.', 90, 45),
  ('red-bull-spotlight', 'Red Bull Spotlight Stage', 'High-energy spotlight placement.', 85, 40),
  ('spotify-discovery', 'Spotify Discovery Stage', 'Emerging artist discovery placement.', 80, 35)
ON CONFLICT (slug) DO NOTHING;

-- Sync arena naming rights contract → venue display columns
CREATE OR REPLACE FUNCTION public.sync_venue_from_naming_rights_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  org_name TEXT;
  org_logo TEXT;
BEGIN
  IF NEW.slot_type_slug <> 'arena_naming_rights' OR NEW.venue_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'active' AND NEW.display_label IS NOT NULL AND trim(NEW.display_label) <> '' THEN
    SELECT name, logo_url INTO org_name, org_logo
    FROM public.sponsor_organizations WHERE id = NEW.organization_id;

    UPDATE public.venues SET
      sponsored_name = NEW.display_label,
      sponsor_company = COALESCE(org_name, NEW.display_label),
      sponsor_logo_url = COALESCE(NEW.logo_url, org_logo),
      sponsor_start_date = NEW.contract_starts_at,
      sponsor_end_date = NEW.contract_ends_at,
      sponsorship_status = CASE
        WHEN NEW.contract_ends_at IS NOT NULL AND NEW.contract_ends_at < CURRENT_DATE THEN 'expired'::public.venue_sponsorship_status
        ELSE 'active'::public.venue_sponsorship_status
      END,
      is_placeholder_name = false
    WHERE id = NEW.venue_id;
  ELSIF NEW.status IN ('expired', 'cancelled') OR (TG_OP = 'DELETE') THEN
    UPDATE public.venues SET
      sponsored_name = NULL,
      sponsor_company = NULL,
      sponsor_logo_url = NULL,
      sponsor_start_date = NULL,
      sponsor_end_date = NULL,
      sponsorship_status = 'available'::public.venue_sponsorship_status,
      is_placeholder_name = true
    WHERE id = COALESCE(NEW.venue_id, OLD.venue_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.premium_sponsorship_contracts c
        WHERE c.venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
          AND c.slot_type_slug = 'arena_naming_rights'
          AND c.status = 'active'
          AND c.id <> COALESCE(NEW.id, OLD.id)
      );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS premium_contracts_sync_naming ON public.premium_sponsorship_contracts;
CREATE TRIGGER premium_contracts_sync_naming
  AFTER INSERT OR UPDATE OF status, display_label, logo_url, contract_starts_at, contract_ends_at, organization_id
  OR DELETE
  ON public.premium_sponsorship_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_venue_from_naming_rights_contract();

-- Backfill naming rights from existing venue rows
INSERT INTO public.premium_sponsorship_contracts (
  slot_type_slug, venue_id, display_label, logo_url,
  contract_value_cents, contract_starts_at, contract_ends_at, status
)
SELECT
  'arena_naming_rights',
  v.id,
  v.sponsored_name,
  v.sponsor_logo_url,
  COALESCE(v.naming_rights_price, 0),
  v.sponsor_start_date,
  v.sponsor_end_date,
  CASE
    WHEN v.sponsorship_status = 'expired' THEN 'expired'::public.sponsorship_contract_status
    WHEN v.sponsorship_status = 'pending' THEN 'pending'::public.sponsorship_contract_status
    WHEN v.sponsorship_status = 'active' THEN 'active'::public.sponsorship_contract_status
    ELSE 'available'::public.sponsorship_contract_status
  END
FROM public.venues v
WHERE v.sponsored_name IS NOT NULL AND trim(v.sponsored_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.premium_sponsorship_contracts c
    WHERE c.venue_id = v.id AND c.slot_type_slug = 'arena_naming_rights'
  );

ALTER TABLE public.sponsorship_slot_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_sponsorship_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Slot types public read" ON public.sponsorship_slot_types FOR SELECT USING (true);
CREATE POLICY "Premium contracts public read active" ON public.premium_sponsorship_contracts FOR SELECT
  USING (status = 'active' OR public.is_admin_profile());
CREATE POLICY "Admin manages premium contracts" ON public.premium_sponsorship_contracts FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
CREATE POLICY "Featured stages public read" ON public.featured_stages FOR SELECT USING (is_active = true OR public.is_admin_profile());
CREATE POLICY "Admin manages featured stages" ON public.featured_stages FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE TRIGGER set_updated_at_premium_contracts
  BEFORE UPDATE ON public.premium_sponsorship_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_featured_stages
  BEFORE UPDATE ON public.featured_stages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
