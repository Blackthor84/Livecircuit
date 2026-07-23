-- Ecosystem M4: LiveCircuit Seasons (hub, leaderboards, badges, merch, frames, archive)

INSERT INTO public.venue_themes (slug, name, description, sort_order, assets, default_palette)
VALUES (
  'spring-indie',
  'Spring Indie Showcase',
  'Pastel stages and boutique showcase energy.',
  11,
  '{"icon":"🌷","heroGradient":"linear-gradient(180deg, oklch(0.62 0.14 350 / 40%), transparent)","meshTint":"oklch(0.65 0.12 350 / 22%)","panelBorder":"oklch(0.72 0.1 350 / 35%)"}'::jsonb,
  '{"primary":"oklch(0.74 0.16 350)","accent":"oklch(0.7 0.14 180)","glow":"oklch(0.82 0.12 350)"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

CREATE TYPE public.season_status AS ENUM ('scheduled', 'active', 'archived');

CREATE TABLE public.livecircuit_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  status public.season_status NOT NULL DEFAULT 'scheduled',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  venue_theme_id UUID REFERENCES public.venue_themes(id) ON DELETE SET NULL,
  profile_frame JSONB NOT NULL DEFAULT '{}'::jsonb,
  decoration_assets JSONB NOT NULL DEFAULT '{}'::jsonb,
  rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX idx_livecircuit_seasons_window ON public.livecircuit_seasons(starts_at, ends_at);
CREATE INDEX idx_livecircuit_seasons_status ON public.livecircuit_seasons(status, sort_order);

CREATE TABLE public.season_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.livecircuit_seasons(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  points_required INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (season_id, slug)
);

CREATE TABLE public.season_merch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.livecircuit_seasons(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  image_url TEXT,
  limited_quantity INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (season_id, slug)
);

CREATE TABLE public.user_season_progress (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.livecircuit_seasons(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  tickets_count INTEGER NOT NULL DEFAULT 0,
  stamps_count INTEGER NOT NULL DEFAULT 0,
  tips_count INTEGER NOT NULL DEFAULT 0,
  merch_orders_count INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, season_id)
);

CREATE TABLE public.user_season_badges (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.season_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE public.season_leaderboard_entries (
  season_id UUID NOT NULL REFERENCES public.livecircuit_seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL,
  display_name TEXT,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, user_id)
);

CREATE INDEX idx_season_leaderboard_rank ON public.season_leaderboard_entries(season_id, rank);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS season_profile_frame JSONB DEFAULT NULL;

-- Seed seasons (Summer active around Jul 2026 demo window)
INSERT INTO public.livecircuit_seasons (
  slug, name, tagline, description, status, starts_at, ends_at, venue_theme_id,
  profile_frame, decoration_assets, rewards, sort_order
)
SELECT
  v.slug,
  v.name,
  v.tagline,
  v.description,
  v.status::public.season_status,
  v.starts_at::timestamptz,
  v.ends_at::timestamptz,
  t.id,
  v.profile_frame::jsonb,
  v.decoration_assets::jsonb,
  v.rewards::jsonb,
  v.sort_order
FROM (VALUES
  (
    'summer-tour-season',
    'Summer Tour Season',
    'Sun-soaked circuits across the map',
    'Arena tours, festival drops, and venue themes lit for peak summer energy.',
    'active',
    '2026-06-01T00:00:00Z',
    '2026-08-31T23:59:59Z',
    'summer-festival',
    '{"slug":"solar-flare","label":"Solar Flare Frame","ringClass":"ring-2 ring-amber-400/70 shadow-[0_0_24px_oklch(0.78_0.18_85_/_35%)]"}',
    '{"bannerIcon":"☀️","confetti":"warm"}',
    '[{"tier":"Bronze","points":100,"reward":"Season badge"},{"tier":"Gold","points":500,"reward":"Profile frame"},{"tier":"Legend","points":1500,"reward":"Exclusive merch drop"}]',
    1
  ),
  (
    'spring-indie-showcase',
    'Spring Indie Showcase',
    'Boutique rooms and emerging voices',
    'Spotlight indie artists, limited merch, and spring-themed venue decor.',
    'archived',
    '2026-03-01T00:00:00Z',
    '2026-05-31T23:59:59Z',
    'spring-indie',
    '{"slug":"bloom-frame","label":"Bloom Frame","ringClass":"ring-2 ring-pink-400/60"}',
    '{"bannerIcon":"🌷","confetti":"petal"}',
    '[{"tier":"Explorer","points":75,"reward":"Indie badge"}]',
    2
  ),
  (
    'halloween-horror-season',
    'Halloween Horror Season',
    'Midnight shows and haunted venues',
    'Spooky concourse overlays, horror comedy stacks, and chase-the-leader boards.',
    'scheduled',
    '2026-10-01T00:00:00Z',
    '2026-10-31T23:59:59Z',
    'halloween',
    '{"slug":"midnight-veil","label":"Midnight Veil Frame","ringClass":"ring-2 ring-orange-500/70"}',
    '{"bannerIcon":"🎃","confetti":"ember"}',
    '[{"tier":"Survivor","points":200,"reward":"Horror badge"}]',
    3
  ),
  (
    'holiday-festival',
    'Holiday Festival',
    'Winter arena spectaculars',
    'Holiday concerts, giftable merch, and gold-trim venue decorations.',
    'scheduled',
    '2026-12-01T00:00:00Z',
    '2027-01-05T23:59:59Z',
    'holiday-concert',
    '{"slug":"aurora-gold","label":"Aurora Gold Frame","ringClass":"ring-2 ring-emerald-400/60"}',
    '{"bannerIcon":"🎄","confetti":"snow"}',
    '[{"tier":"Celebrant","points":150,"reward":"Holiday badge"}]',
    4
  )
) AS v(slug, name, tagline, description, status, starts_at, ends_at, theme_slug, profile_frame, decoration_assets, rewards, sort_order)
JOIN public.venue_themes t ON t.slug = v.theme_slug
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.season_badges (season_id, slug, name, description, icon, points_required, sort_order)
SELECT s.id, b.slug, b.name, b.description, b.icon, b.points_required, b.sort_order
FROM public.livecircuit_seasons s
JOIN (VALUES
  ('summer-tour-season', 'road-warrior', 'Road Warrior', 'Earn 250 season points.', '🔥', 250, 1),
  ('summer-tour-season', 'festival-vip', 'Festival VIP', 'Attend 3 ticketed shows in-season.', '🎟️', 400, 2),
  ('halloween-horror-season', 'night-shift', 'Night Shift', 'Catch a late-night horror or comedy set.', '🌙', 150, 1),
  ('holiday-festival', 'gift-spirit', 'Gift Spirit', 'Complete a merch purchase during the festival.', '🎁', 200, 1),
  ('spring-indie-showcase', 'indie-scout', 'Indie Scout', 'Discover 2 indie showcases.', '🌷', 100, 1)
) AS b(season_slug, slug, name, description, icon, points_required, sort_order) ON s.slug = b.season_slug
ON CONFLICT (season_id, slug) DO NOTHING;

INSERT INTO public.season_merch_items (season_id, slug, name, description, price_cents, limited_quantity, sort_order)
SELECT s.id, m.slug, m.name, m.description, m.price_cents, m.limited_quantity, m.sort_order
FROM public.livecircuit_seasons s
JOIN (VALUES
  ('summer-tour-season', 'sunset-tee', 'Sunset Circuit Tee', 'Limited summer tour graphic tee.', 3200, 500, 1),
  ('summer-tour-season', 'festival-poster', 'Festival Poster Pack', 'Digital + print-ready arena posters.', 1800, NULL, 2),
  ('halloween-horror-season', 'midnight-hoodie', 'Midnight Hoodie', 'Glow ink horror season exclusive.', 5800, 200, 1),
  ('holiday-festival', 'ornament-bundle', 'Venue Ornament Bundle', 'Collectible venue ornament set.', 2400, 350, 1),
  ('spring-indie-showcase', 'indie-vinyl', 'Indie Vinyl Drop', 'Archived season vinyl pre-order.', 4500, 0, 1)
) AS m(season_slug, slug, name, description, price_cents, limited_quantity, sort_order) ON s.slug = m.season_slug
ON CONFLICT (season_id, slug) DO NOTHING;

ALTER TABLE public.livecircuit_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_merch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_season_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_season_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seasons public read" ON public.livecircuit_seasons FOR SELECT USING (true);
CREATE POLICY "Season badges public read" ON public.season_badges FOR SELECT USING (true);
CREATE POLICY "Season merch public read" ON public.season_merch_items FOR SELECT USING (true);
CREATE POLICY "Leaderboard public read" ON public.season_leaderboard_entries FOR SELECT USING (true);

CREATE POLICY "Users read own season progress" ON public.user_season_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own season progress" ON public.user_season_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own season progress" ON public.user_season_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own season badges" ON public.user_season_badges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users earn season badges" ON public.user_season_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read season badges earned" ON public.user_season_badges
  FOR SELECT USING (true);

CREATE POLICY "Admin seasons" ON public.livecircuit_seasons
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Admin season progress" ON public.user_season_progress
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Admin leaderboard" ON public.season_leaderboard_entries
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
