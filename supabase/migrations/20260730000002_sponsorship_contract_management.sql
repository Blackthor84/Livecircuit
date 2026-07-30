-- Sponsorship Contract Management: full business contracts, waitlists, auctions, price history, exclusivity

ALTER TYPE public.sponsorship_contract_status ADD VALUE IF NOT EXISTS 'reserved';

CREATE TYPE public.sponsorship_payment_frequency AS ENUM (
  'monthly',
  'quarterly',
  'bi_annual',
  'annual',
  'one_time',
  'custom'
);

CREATE TYPE public.sponsorship_renewal_status AS ENUM (
  'not_due',
  'pending_renewal',
  'renewed',
  'declined',
  'expired'
);

CREATE TYPE public.sponsorship_auction_status AS ENUM (
  'draft',
  'open',
  'closed',
  'awarded',
  'cancelled'
);

CREATE TYPE public.sponsorship_bid_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'countered',
  'withdrawn'
);

CREATE TYPE public.sponsorship_exclusivity_scope AS ENUM (
  'city',
  'state',
  'genre',
  'category',
  'platform'
);

CREATE TYPE public.sponsorship_waiting_list_status AS ENUM (
  'active',
  'notified',
  'converted',
  'withdrawn'
);

-- Extend slot type catalog for modular admin-created types
ALTER TABLE public.sponsorship_slot_types
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS display_location TEXT,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS renewal_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reporting_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS analytics_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS allowed_contract_lengths JSONB NOT NULL DEFAULT '[1,3,6,12,24,36,60]'::jsonb,
  ADD COLUMN IF NOT EXISTS allowed_payment_frequencies JSONB NOT NULL DEFAULT '["monthly","quarterly","bi_annual","annual","one_time","custom"]'::jsonb,
  ADD COLUMN IF NOT EXISTS auction_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclusivity_scope public.sponsorship_exclusivity_scope;

-- Full business contract fields
ALTER TABLE public.premium_sponsorship_contracts
  ADD COLUMN IF NOT EXISTS sponsor_website TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state_code TEXT,
  ADD COLUMN IF NOT EXISTS contract_length_months INTEGER,
  ADD COLUMN IF NOT EXISTS custom_contract_length BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_frequency public.sponsorship_payment_frequency DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS custom_payment_plan TEXT,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_status public.sponsorship_renewal_status NOT NULL DEFAULT 'not_due',
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS ai_recommended_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS ai_price_accepted BOOLEAN,
  ADD COLUMN IF NOT EXISTS previous_contract_id UUID REFERENCES public.premium_sponsorship_contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS renewed_from_id UUID REFERENCES public.premium_sponsorship_contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_premium_contracts_renewal ON public.premium_sponsorship_contracts(contract_ends_at, auto_renew, status);
CREATE INDEX IF NOT EXISTS idx_premium_contracts_state ON public.premium_sponsorship_contracts(state_code);

-- Waiting list when slots are sold
CREATE TABLE IF NOT EXISTS public.sponsorship_waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_type_slug TEXT NOT NULL REFERENCES public.sponsorship_slot_types(slug),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
  featured_stage_id UUID REFERENCES public.featured_stages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  contact_name TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  notes TEXT,
  queue_position INTEGER NOT NULL DEFAULT 1,
  status public.sponsorship_waiting_list_status NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_waitlist_slot ON public.sponsorship_waiting_list(slot_type_slug, venue_id, status);

-- Auction mode for premium inventory
CREATE TABLE IF NOT EXISTS public.sponsorship_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_type_slug TEXT NOT NULL REFERENCES public.sponsorship_slot_types(slug),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  display_label TEXT NOT NULL,
  description TEXT,
  status public.sponsorship_auction_status NOT NULL DEFAULT 'draft',
  starting_bid_cents INTEGER NOT NULL DEFAULT 0,
  reserve_price_cents INTEGER,
  current_high_bid_cents INTEGER NOT NULL DEFAULT 0,
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  awarded_contract_id UUID REFERENCES public.premium_sponsorship_contracts(id) ON DELETE SET NULL,
  awarded_bid_id UUID,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sponsorship_auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.sponsorship_auctions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  bid_amount_cents INTEGER NOT NULL,
  counter_amount_cents INTEGER,
  status public.sponsorship_bid_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsorship_auctions
  ADD CONSTRAINT sponsorship_auctions_awarded_bid_fkey
  FOREIGN KEY (awarded_bid_id) REFERENCES public.sponsorship_auction_bids(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sponsorship_auctions_status ON public.sponsorship_auctions(status, closes_at);
CREATE INDEX IF NOT EXISTS idx_sponsorship_auction_bids ON public.sponsorship_auction_bids(auction_id, status);

-- Price history for every sale
CREATE TABLE IF NOT EXISTS public.sponsorship_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.premium_sponsorship_contracts(id) ON DELETE SET NULL,
  slot_type_slug TEXT NOT NULL REFERENCES public.sponsorship_slot_types(slug),
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.sponsor_organizations(id) ON DELETE SET NULL,
  sponsor_name TEXT NOT NULL,
  contract_length_months INTEGER,
  contract_value_cents INTEGER NOT NULL DEFAULT 0,
  renewed BOOLEAN NOT NULL DEFAULT false,
  expiration_date DATE,
  lifetime_revenue_cents INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_price_history_venue ON public.sponsorship_price_history(venue_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsorship_price_history_org ON public.sponsorship_price_history(organization_id, recorded_at DESC);

-- Renewal notification schedule (when auto_renew is disabled)
CREATE TABLE IF NOT EXISTS public.sponsorship_renewal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.premium_sponsorship_contracts(id) ON DELETE CASCADE,
  days_before_expiration INTEGER NOT NULL,
  scheduled_for DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  recipient_type TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, days_before_expiration, recipient_type)
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_renewal_notif_due ON public.sponsorship_renewal_notifications(scheduled_for, sent_at);

-- Exclusivity purchases (city, state, genre, category, platform)
CREATE TABLE IF NOT EXISTS public.sponsorship_exclusivity_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.premium_sponsorship_contracts(id) ON DELETE CASCADE,
  slot_type_slug TEXT NOT NULL REFERENCES public.sponsorship_slot_types(slug),
  scope public.sponsorship_exclusivity_scope NOT NULL,
  scope_value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at DATE,
  ends_at DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsorship_exclusivity_one_active
  ON public.sponsorship_exclusivity_grants(slot_type_slug, scope, scope_value)
  WHERE is_active = true;

-- Record price history when contract ends or is superseded
CREATE OR REPLACE FUNCTION public.record_sponsorship_price_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  org_name TEXT;
  lifetime_cents INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IN ('active', 'pending', 'reserved')
     AND NEW.status IN ('expired', 'cancelled') THEN
    SELECT name INTO org_name FROM public.sponsor_organizations WHERE id = OLD.organization_id;

    SELECT COALESCE(SUM(contract_value_cents), 0) INTO lifetime_cents
    FROM public.premium_sponsorship_contracts
    WHERE organization_id = OLD.organization_id
      AND slot_type_slug = OLD.slot_type_slug
      AND COALESCE(venue_id, '00000000-0000-0000-0000-000000000000'::uuid) =
          COALESCE(OLD.venue_id, '00000000-0000-0000-0000-000000000000'::uuid);

    INSERT INTO public.sponsorship_price_history (
      contract_id, slot_type_slug, venue_id, organization_id, sponsor_name,
      contract_length_months, contract_value_cents, renewed, expiration_date, lifetime_revenue_cents
    ) VALUES (
      OLD.id, OLD.slot_type_slug, OLD.venue_id, OLD.organization_id,
      COALESCE(org_name, OLD.display_label),
      OLD.contract_length_months, OLD.contract_value_cents,
      EXISTS (SELECT 1 FROM public.premium_sponsorship_contracts c WHERE c.renewed_from_id = OLD.id),
      OLD.contract_ends_at, lifetime_cents
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS premium_contracts_price_history ON public.premium_sponsorship_contracts;
CREATE TRIGGER premium_contracts_price_history
  AFTER UPDATE OF status ON public.premium_sponsorship_contracts
  FOR EACH ROW EXECUTE FUNCTION public.record_sponsorship_price_history();

-- Schedule renewal notifications when contract is created/updated without auto_renew
CREATE OR REPLACE FUNCTION public.schedule_sponsorship_renewal_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  d INTEGER;
  reminder_days INTEGER[] := ARRAY[180, 90, 60, 30, 14, 7, 1];
BEGIN
  IF NEW.auto_renew = true OR NEW.contract_ends_at IS NULL OR NEW.status NOT IN ('active', 'pending', 'reserved') THEN
    DELETE FROM public.sponsorship_renewal_notifications WHERE contract_id = NEW.id;
    RETURN NEW;
  END IF;

  DELETE FROM public.sponsorship_renewal_notifications WHERE contract_id = NEW.id;

  FOREACH d IN ARRAY reminder_days LOOP
    INSERT INTO public.sponsorship_renewal_notifications (contract_id, days_before_expiration, scheduled_for, recipient_type)
    VALUES (NEW.id, d, (NEW.contract_ends_at - (d || ' days')::interval)::date, 'admin')
    ON CONFLICT (contract_id, days_before_expiration, recipient_type) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS premium_contracts_schedule_renewals ON public.premium_sponsorship_contracts;
CREATE TRIGGER premium_contracts_schedule_renewal_notifications
  AFTER INSERT OR UPDATE OF contract_ends_at, auto_renew, status
  ON public.premium_sponsorship_contracts
  FOR EACH ROW EXECUTE FUNCTION public.schedule_sponsorship_renewal_notifications();

-- Denormalize city/state from venue on contract insert/update
CREATE OR REPLACE FUNCTION public.sync_contract_venue_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.venue_id IS NOT NULL THEN
    SELECT region, state_code INTO NEW.city, NEW.state_code
    FROM public.venues WHERE id = NEW.venue_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS premium_contracts_sync_location ON public.premium_sponsorship_contracts;
CREATE TRIGGER premium_contracts_sync_location
  BEFORE INSERT OR UPDATE OF venue_id ON public.premium_sponsorship_contracts
  FOR EACH ROW EXECUTE FUNCTION public.sync_contract_venue_location();

-- RLS
ALTER TABLE public.sponsorship_waiting_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_renewal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_exclusivity_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Waitlist org members read own" ON public.sponsorship_waiting_list FOR SELECT
  USING (
    public.is_admin_profile() OR
    EXISTS (
      SELECT 1 FROM public.sponsor_organization_members m
      WHERE m.organization_id = sponsorship_waiting_list.organization_id AND m.user_id = auth.uid()
    )
  );
CREATE POLICY "Waitlist org members insert" ON public.sponsorship_waiting_list FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sponsor_organization_members m
      WHERE m.organization_id = sponsorship_waiting_list.organization_id AND m.user_id = auth.uid()
    )
  );
CREATE POLICY "Admin manages waitlist" ON public.sponsorship_waiting_list FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Auctions public read open" ON public.sponsorship_auctions FOR SELECT
  USING (status IN ('open', 'closed', 'awarded') OR public.is_admin_profile());
CREATE POLICY "Admin manages auctions" ON public.sponsorship_auctions FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Bids org members read" ON public.sponsorship_auction_bids FOR SELECT
  USING (
    public.is_admin_profile() OR
    EXISTS (
      SELECT 1 FROM public.sponsor_organization_members m
      WHERE m.organization_id = sponsorship_auction_bids.organization_id AND m.user_id = auth.uid()
    )
  );
CREATE POLICY "Bids org members insert" ON public.sponsorship_auction_bids FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sponsor_organization_members m
      WHERE m.organization_id = sponsorship_auction_bids.organization_id AND m.user_id = auth.uid()
    )
  );
CREATE POLICY "Admin manages bids" ON public.sponsorship_auction_bids FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Price history admin read" ON public.sponsorship_price_history FOR SELECT
  USING (public.is_admin_profile() OR true);
CREATE POLICY "Admin manages price history" ON public.sponsorship_price_history FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Renewal notif admin" ON public.sponsorship_renewal_notifications FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Exclusivity public read active" ON public.sponsorship_exclusivity_grants FOR SELECT USING (is_active = true OR public.is_admin_profile());
CREATE POLICY "Admin manages exclusivity" ON public.sponsorship_exclusivity_grants FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE TRIGGER set_updated_at_sponsorship_waiting_list
  BEFORE UPDATE ON public.sponsorship_waiting_list
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_sponsorship_auctions
  BEFORE UPDATE ON public.sponsorship_auctions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_sponsorship_auction_bids
  BEFORE UPDATE ON public.sponsorship_auction_bids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reserved contracts also block inventory slots
DROP INDEX IF EXISTS idx_premium_one_venue_slot;
CREATE UNIQUE INDEX idx_premium_one_venue_slot
  ON public.premium_sponsorship_contracts(slot_type_slug, venue_id)
  WHERE venue_id IS NOT NULL AND status IN ('active', 'pending', 'reserved');

DROP INDEX IF EXISTS idx_premium_one_event_slot;
CREATE UNIQUE INDEX idx_premium_one_event_slot
  ON public.premium_sponsorship_contracts(slot_type_slug, event_id)
  WHERE event_id IS NOT NULL AND status IN ('active', 'pending', 'reserved');

DROP INDEX IF EXISTS idx_premium_one_tour_slot;
CREATE UNIQUE INDEX idx_premium_one_tour_slot
  ON public.premium_sponsorship_contracts(slot_type_slug, tour_id)
  WHERE tour_id IS NOT NULL AND status IN ('active', 'pending', 'reserved');

DROP INDEX IF EXISTS idx_premium_one_platform_slot;
CREATE UNIQUE INDEX idx_premium_one_platform_slot
  ON public.premium_sponsorship_contracts(slot_type_slug)
  WHERE venue_id IS NULL AND event_id IS NULL AND tour_id IS NULL AND featured_stage_id IS NULL
    AND status IN ('active', 'pending', 'reserved');

CREATE POLICY "Sponsor org reads own contracts" ON public.premium_sponsorship_contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_organization_members m
      WHERE m.organization_id = premium_sponsorship_contracts.organization_id AND m.user_id = auth.uid()
    )
  );
