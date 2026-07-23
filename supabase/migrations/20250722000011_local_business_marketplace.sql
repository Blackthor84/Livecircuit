-- Ecosystem M11: Local Business Marketplace (venue-linked SMB listings, coupons, paid campaigns)

CREATE TYPE public.local_business_category AS ENUM (
  'restaurant',
  'hotel',
  'coffee',
  'parking',
  'museum',
  'tourism',
  'attraction'
);

CREATE TYPE public.local_business_campaign_type AS ENUM (
  'featured_listing',
  'coupon_boost',
  'venue_ad',
  'festival_sponsor',
  'homepage_promo'
);

CREATE TYPE public.local_business_campaign_status AS ENUM (
  'draft',
  'pending_payment',
  'active',
  'ended',
  'cancelled'
);

CREATE TABLE public.local_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category public.local_business_category NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  website_url TEXT,
  address_line TEXT,
  city TEXT,
  phone TEXT,
  logo_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_local_businesses_owner ON public.local_businesses(owner_user_id);
CREATE INDEX idx_local_businesses_category ON public.local_businesses(category) WHERE is_published = true;

CREATE TABLE public.venue_local_businesses (
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.local_businesses(id) ON DELETE CASCADE,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, business_id)
);

CREATE INDEX idx_venue_local_business_featured ON public.venue_local_businesses(venue_id, is_featured DESC, sort_order);

CREATE TABLE public.local_business_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.local_businesses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_label TEXT NOT NULL,
  max_redemptions INTEGER,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, code)
);

CREATE TABLE public.local_business_coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.local_business_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);

CREATE TABLE public.local_business_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.local_businesses(id) ON DELETE CASCADE,
  campaign_type public.local_business_campaign_type NOT NULL,
  status public.local_business_campaign_status NOT NULL DEFAULT 'draft',
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  festival_id UUID REFERENCES public.virtual_festivals(id) ON DELETE SET NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  impression_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  stripe_checkout_session_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_local_campaigns_business ON public.local_business_campaigns(business_id, status);
CREATE INDEX idx_local_campaigns_active ON public.local_business_campaigns(campaign_type, status)
  WHERE status = 'active';

ALTER TABLE public.local_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_local_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_business_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_business_coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_business_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Local businesses public read" ON public.local_businesses
  FOR SELECT USING (is_published = true OR auth.uid() = owner_user_id);
CREATE POLICY "Local businesses owner manage" ON public.local_businesses
  FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Venue local businesses public read" ON public.venue_local_businesses FOR SELECT USING (true);
CREATE POLICY "Venue links owner manage" ON public.venue_local_businesses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.local_businesses b
      WHERE b.id = business_id AND b.owner_user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.local_businesses b
      WHERE b.id = business_id AND b.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Coupons public read active" ON public.local_business_coupons
  FOR SELECT USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM public.local_businesses b
      WHERE b.id = business_id AND b.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "Coupons owner manage" ON public.local_business_coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.local_businesses b
      WHERE b.id = business_id AND b.owner_user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.local_businesses b
      WHERE b.id = business_id AND b.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Redemptions read own or owner" ON public.local_business_coupon_redemptions
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.local_business_coupons c
      JOIN public.local_businesses b ON b.id = c.business_id
      WHERE c.id = coupon_id AND b.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "Redemptions insert own" ON public.local_business_coupon_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Campaigns owner read" ON public.local_business_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.local_businesses b
      WHERE b.id = business_id AND b.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "Campaigns public read active" ON public.local_business_campaigns
  FOR SELECT USING (status = 'active');
CREATE POLICY "Campaigns owner insert" ON public.local_business_campaigns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.local_businesses b
      WHERE b.id = business_id AND b.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin local business" ON public.local_businesses
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
