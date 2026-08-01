-- Tour-first product extensions: followers, tour-scoped merch, tour passes, commerce rollups

ALTER TYPE public.order_type ADD VALUE IF NOT EXISTS 'tour_pass';

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tickets_sold INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tour_pass_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS poster_url TEXT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_tour ON public.products(tour_id) WHERE tour_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.tour_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fan_id, tour_id)
);

CREATE INDEX IF NOT EXISTS idx_tour_followers_tour ON public.tour_followers(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_followers_fan ON public.tour_followers(fan_id);

CREATE TABLE IF NOT EXISTS public.tour_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  tier TEXT NOT NULL DEFAULT 'general',
  price_cents INTEGER NOT NULL,
  qr_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tour_id, user_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_tour_passes_tour ON public.tour_passes(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_passes_user ON public.tour_passes(user_id);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.tour_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tour followers read" ON public.tour_followers FOR SELECT USING (true);
CREATE POLICY "Tour follow insert" ON public.tour_followers FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Tour unfollow delete" ON public.tour_followers FOR DELETE USING (auth.uid() = fan_id);

CREATE POLICY "Tour passes read own" ON public.tour_passes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tour passes read artist" ON public.tour_passes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tours t
      JOIN public.artists a ON a.id = t.artist_id
      WHERE t.id = tour_id AND a.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.sync_tour_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tours SET follower_count = follower_count + 1 WHERE id = NEW.tour_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tours SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.tour_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_tour_follower_change ON public.tour_followers;
CREATE TRIGGER on_tour_follower_change
  AFTER INSERT OR DELETE ON public.tour_followers
  FOR EACH ROW EXECUTE FUNCTION public.sync_tour_follower_count();

CREATE OR REPLACE FUNCTION public.sync_tour_commerce_from_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_tour_id UUID;
BEGIN
  SELECT ts.tour_id INTO v_tour_id
  FROM public.events e
  JOIN public.tour_stops ts ON ts.id = e.tour_stop_id
  WHERE e.id = NEW.event_id;

  IF v_tour_id IS NOT NULL THEN
    UPDATE public.tours
    SET
      tickets_sold = tickets_sold + 1,
      revenue_cents = revenue_cents + COALESCE(NEW.price_cents, 0)
    WHERE id = v_tour_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_ticket_tour_commerce ON public.tickets;
CREATE TRIGGER on_ticket_tour_commerce
  AFTER INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.sync_tour_commerce_from_ticket();

CREATE OR REPLACE FUNCTION public.sync_tour_commerce_from_pass()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tours
  SET
    tickets_sold = tickets_sold + 1,
    revenue_cents = revenue_cents + COALESCE(NEW.price_cents, 0)
  WHERE id = NEW.tour_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_tour_pass_commerce ON public.tour_passes;
CREATE TRIGGER on_tour_pass_commerce
  AFTER INSERT ON public.tour_passes
  FOR EACH ROW EXECUTE FUNCTION public.sync_tour_commerce_from_pass();

CREATE TRIGGER set_updated_at_tour_followers
  BEFORE UPDATE ON public.tour_followers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_tour_passes
  BEFORE UPDATE ON public.tour_passes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
