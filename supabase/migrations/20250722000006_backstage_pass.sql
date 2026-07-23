-- Ecosystem M6: Backstage Pass (artist memberships + recurring Stripe)

CREATE TYPE public.backstage_subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');

CREATE TABLE public.backstage_pass_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Backstage Pass',
  description TEXT,
  price_cents_monthly INTEGER NOT NULL CHECK (price_cents_monthly >= 0),
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  discord_url TEXT,
  early_ticket_hours INTEGER NOT NULL DEFAULT 24,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, slug)
);

CREATE TABLE public.backstage_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.backstage_pass_plans(id) ON DELETE RESTRICT,
  status public.backstage_subscription_status NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, artist_id)
);

CREATE INDEX idx_backstage_subs_artist ON public.backstage_subscriptions(artist_id, status);

CREATE TABLE public.backstage_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.backstage_pass_plans(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  members_only BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backstage_announcements_artist ON public.backstage_announcements(artist_id, published_at DESC);

CREATE TABLE public.backstage_collectibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.backstage_pass_plans(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (plan_id, slug)
);

CREATE TABLE public.user_backstage_collectibles (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collectible_id UUID NOT NULL REFERENCES public.backstage_collectibles(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, collectible_id)
);

-- Seed default plans for existing artists
INSERT INTO public.backstage_pass_plans (artist_id, slug, name, description, price_cents_monthly, perks, discord_url, early_ticket_hours)
SELECT
  a.id,
  'backstage',
  a.stage_name || ' Backstage Pass',
  'Monthly membership with private streams, backstage chat, early tickets, and member drops.',
  999,
  '["Private livestreams","Exclusive concerts","Q&A sessions","Backstage chat","Digital collectibles","Early ticket access","Exclusive merchandise","Member announcements"]'::jsonb,
  NULL,
  48
FROM public.artists a
WHERE NOT EXISTS (
  SELECT 1 FROM public.backstage_pass_plans p WHERE p.artist_id = a.id AND p.slug = 'backstage'
)
LIMIT 20;

INSERT INTO public.backstage_collectibles (plan_id, slug, name, description, sort_order)
SELECT p.id, 'welcome-badge', 'Founding Member Badge', 'Granted when you subscribe.', 1
FROM public.backstage_pass_plans p
WHERE p.slug = 'backstage'
  AND NOT EXISTS (
    SELECT 1 FROM public.backstage_collectibles c WHERE c.plan_id = p.id AND c.slug = 'welcome-badge'
  );

ALTER TABLE public.backstage_pass_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backstage_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backstage_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backstage_collectibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_backstage_collectibles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backstage plans public read" ON public.backstage_pass_plans
  FOR SELECT USING (is_active = true OR public.is_admin_profile());

CREATE POLICY "Artists manage own backstage plans" ON public.backstage_pass_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.artists ar WHERE ar.id = artist_id AND ar.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.artists ar WHERE ar.id = artist_id AND ar.user_id = auth.uid())
  );

CREATE POLICY "Users read own backstage subs" ON public.backstage_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Artists read subs for own page" ON public.backstage_subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.artists ar WHERE ar.id = artist_id AND ar.user_id = auth.uid())
  );
CREATE POLICY "Public read active subs count" ON public.backstage_subscriptions
  FOR SELECT USING (status = 'active');

CREATE POLICY "Announcements public read" ON public.backstage_announcements
  FOR SELECT USING (NOT members_only OR auth.uid() IS NOT NULL);

CREATE POLICY "Artists manage announcements" ON public.backstage_announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.artists ar WHERE ar.id = artist_id AND ar.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.artists ar WHERE ar.id = artist_id AND ar.user_id = auth.uid())
  );

CREATE POLICY "Users insert own backstage subs" ON public.backstage_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own backstage subs" ON public.backstage_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Collectibles public read" ON public.backstage_collectibles FOR SELECT USING (true);
CREATE POLICY "Users read own backstage collectibles" ON public.user_backstage_collectibles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users earn backstage collectibles" ON public.user_backstage_collectibles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin backstage" ON public.backstage_pass_plans
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
CREATE POLICY "Admin backstage subs" ON public.backstage_subscriptions
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
