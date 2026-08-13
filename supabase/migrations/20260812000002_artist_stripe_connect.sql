-- Phase 2: Stripe Connect Express metadata on artists

ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_requirements_due JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stripe_connect_updated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_stripe_account_id
  ON public.artists (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_artists_stripe_connect_updated_at
  ON public.artists (stripe_connect_updated_at DESC)
  WHERE stripe_connect_updated_at IS NOT NULL;

COMMENT ON COLUMN public.artists.stripe_account_id IS 'Stripe Connect Express account id (acct_...)';
COMMENT ON COLUMN public.artists.stripe_onboarding_complete IS 'True when Connect account can receive ticket payouts (server/webhook only)';
COMMENT ON COLUMN public.artists.stripe_requirements_due IS 'Stripe requirements.currently_due snapshot';

-- Prevent clients from forging Connect status; server/webhook uses service_role.
CREATE OR REPLACE FUNCTION public.guard_artist_stripe_connect_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
     OR NEW.stripe_onboarding_complete IS DISTINCT FROM OLD.stripe_onboarding_complete
     OR NEW.stripe_charges_enabled IS DISTINCT FROM OLD.stripe_charges_enabled
     OR NEW.stripe_payouts_enabled IS DISTINCT FROM OLD.stripe_payouts_enabled
     OR NEW.stripe_details_submitted IS DISTINCT FROM OLD.stripe_details_submitted
     OR NEW.stripe_requirements_due IS DISTINCT FROM OLD.stripe_requirements_due
     OR NEW.stripe_connect_updated_at IS DISTINCT FROM OLD.stripe_connect_updated_at THEN
    RAISE EXCEPTION 'Stripe Connect fields are managed by LiveCircuit servers';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_artist_stripe_connect_update ON public.artists;
CREATE TRIGGER trg_guard_artist_stripe_connect_update
  BEFORE UPDATE ON public.artists
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_artist_stripe_connect_update();
