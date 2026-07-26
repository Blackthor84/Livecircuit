-- Ecosystem M10: Creator Marketplace

CREATE TYPE public.marketplace_booking_status AS ENUM (
  'pending',
  'accepted',
  'declined',
  'awaiting_payment',
  'paid',
  'completed',
  'cancelled'
);

CREATE TABLE public.creator_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  headline TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  primary_category TEXT NOT NULL,
  secondary_categories TEXT[] NOT NULL DEFAULT '{}',
  rate_cents INTEGER NOT NULL DEFAULT 5000 CHECK (rate_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  is_listed BOOLEAN NOT NULL DEFAULT true,
  average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creator_profiles_category ON public.creator_profiles(primary_category) WHERE is_listed = true;

CREATE TABLE public.creator_portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL REFERENCES public.creator_profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.marketplace_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_user_id UUID NOT NULL REFERENCES public.creator_profiles(user_id) ON DELETE CASCADE,
  service_category TEXT NOT NULL,
  title TEXT NOT NULL,
  brief TEXT NOT NULL DEFAULT '',
  agreed_price_cents INTEGER CHECK (agreed_price_cents IS NULL OR agreed_price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.marketplace_booking_status NOT NULL DEFAULT 'pending',
  stripe_checkout_session_id TEXT,
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_bookings_artist ON public.marketplace_bookings(artist_user_id, created_at DESC);
CREATE INDEX idx_marketplace_bookings_creator ON public.marketplace_bookings(creator_user_id, created_at DESC);

CREATE TABLE public.marketplace_booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.marketplace_bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_booking_messages ON public.marketplace_booking_messages(booking_id, created_at ASC);

CREATE TABLE public.marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.marketplace_bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_user_id UUID NOT NULL REFERENCES public.creator_profiles(user_id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_reviews_creator ON public.marketplace_reviews(creator_user_id, created_at DESC);

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator profiles public listed" ON public.creator_profiles
  FOR SELECT USING (is_listed = true OR auth.uid() = user_id);
CREATE POLICY "Creator profiles upsert own" ON public.creator_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Portfolio public read" ON public.creator_portfolio_items FOR SELECT USING (true);
CREATE POLICY "Portfolio manage own" ON public.creator_portfolio_items
  FOR ALL USING (auth.uid() = creator_user_id) WITH CHECK (auth.uid() = creator_user_id);

CREATE POLICY "Bookings read participants" ON public.marketplace_bookings
  FOR SELECT USING (auth.uid() = artist_user_id OR auth.uid() = creator_user_id);
CREATE POLICY "Bookings artist insert" ON public.marketplace_bookings
  FOR INSERT WITH CHECK (auth.uid() = artist_user_id);
CREATE POLICY "Bookings participants update" ON public.marketplace_bookings
  FOR UPDATE USING (auth.uid() = artist_user_id OR auth.uid() = creator_user_id);

CREATE POLICY "Booking messages read" ON public.marketplace_booking_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_bookings b
      WHERE b.id = booking_id
        AND (b.artist_user_id = auth.uid() OR b.creator_user_id = auth.uid())
    )
  );
CREATE POLICY "Booking messages insert" ON public.marketplace_booking_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.marketplace_bookings b
      WHERE b.id = booking_id
        AND (b.artist_user_id = auth.uid() OR b.creator_user_id = auth.uid())
    )
  );

CREATE POLICY "Reviews public read" ON public.marketplace_reviews FOR SELECT USING (true);
CREATE POLICY "Reviews insert reviewer" ON public.marketplace_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Admin creator marketplace" ON public.creator_profiles
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
