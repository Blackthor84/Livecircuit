-- Ecosystem M5: Virtual Festivals

CREATE TYPE public.festival_status AS ENUM ('scheduled', 'live', 'ended', 'archived');
CREATE TYPE public.festival_slot_type AS ENUM ('performance', 'meet_greet');

CREATE TABLE public.virtual_festivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  banner_icon TEXT,
  status public.festival_status NOT NULL DEFAULT 'scheduled',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  map_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE public.festival_venues (
  festival_id UUID NOT NULL REFERENCES public.virtual_festivals(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  map_x NUMERIC(5, 2) NOT NULL DEFAULT 50,
  map_y NUMERIC(5, 2) NOT NULL DEFAULT 50,
  map_label TEXT,
  PRIMARY KEY (festival_id, venue_id)
);

CREATE TABLE public.festival_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.virtual_festivals(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (festival_id, day_date)
);

CREATE TABLE public.festival_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.virtual_festivals(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES public.festival_days(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slot_type public.festival_slot_type NOT NULL DEFAULT 'performance',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_vip_only BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_festival_slots_festival_time ON public.festival_slots(festival_id, starts_at);

CREATE TABLE public.festival_pass_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.virtual_festivals(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  is_vip_upgrade BOOLEAN NOT NULL DEFAULT false,
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (festival_id, slug)
);

CREATE TABLE public.festival_pass_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.virtual_festivals(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.festival_pass_tiers(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tier_id)
);

CREATE TABLE public.festival_collectibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.virtual_festivals(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rarity TEXT NOT NULL DEFAULT 'common',
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (festival_id, slug)
);

CREATE TABLE public.user_festival_collectibles (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collectible_id UUID NOT NULL REFERENCES public.festival_collectibles(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, collectible_id)
);

CREATE TABLE public.festival_achievement_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.virtual_festivals(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (festival_id, slug)
);

CREATE TABLE public.user_festival_achievements (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.festival_achievement_defs(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE public.festival_leaderboard_entries (
  festival_id UUID NOT NULL REFERENCES public.virtual_festivals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL,
  display_name TEXT,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (festival_id, user_id)
);

CREATE INDEX idx_festival_leaderboard_rank ON public.festival_leaderboard_entries(festival_id, rank);

-- Seed festivals
INSERT INTO public.virtual_festivals (slug, name, tagline, description, banner_icon, status, starts_at, ends_at, map_config)
VALUES
  (
    'livecircuit-summer-fest',
    'LiveCircuit Summer Fest',
    'The flagship multi-venue spectacular',
    'Three days, simultaneous stages, festival passes, VIP upgrades, and collectible drops.',
    '☀️',
    'live',
    '2026-07-18T16:00:00Z',
    '2026-07-21T04:00:00Z',
    '{"width":100,"height":100,"background":"gradient-summer"}'::jsonb
  ),
  (
    'comedy-weekend',
    'Comedy Weekend',
    'Stand-up stacks and late-night rooms',
    'Multi-venue laugh circuits with meet-and-greets and VIP green rooms.',
    '🎤',
    'scheduled',
    '2026-08-08T18:00:00Z',
    '2026-08-10T23:59:59Z',
    '{"width":100,"height":100}'::jsonb
  ),
  (
    'animecon-live',
    'AnimeCon Live',
    'Panels, concerts, and cosplay nights',
    'Anime festival grounds across virtual venues with simultaneous programming.',
    '🌸',
    'scheduled',
    '2026-09-12T14:00:00Z',
    '2026-09-14T23:59:59Z',
    '{"width":100,"height":100}'::jsonb
  ),
  (
    'edm-world',
    'EDM World',
    'Bass-forward nights across the map',
    'Laser-grid stages, DJ battles, and VIP lounge upgrades.',
    '🎧',
    'scheduled',
    '2026-10-03T20:00:00Z',
    '2026-10-05T06:00:00Z',
    '{"width":100,"height":100}'::jsonb
  ),
  (
    'country-music-festival',
    'Country Music Festival',
    'Honky-tonk circuits and main stages',
    'Country weekend with hall-of-fame venues and festival passes.',
    '🤠',
    'scheduled',
    '2026-11-07T17:00:00Z',
    '2026-11-09T23:59:59Z',
    '{"width":100,"height":100}'::jsonb
  ),
  (
    'global-podcast-expo',
    'Global Podcast Expo',
    'Live tapings and fan meetups',
    'Podcast stages, interview lounges, and expo hall map.',
    '🎙️',
    'scheduled',
    '2026-12-05T15:00:00Z',
    '2026-12-07T23:59:59Z',
    '{"width":100,"height":100}'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.festival_venues (festival_id, venue_id, map_x, map_y, map_label)
SELECT f.id, v.id, pin.map_x, pin.map_y, pin.map_label
FROM public.virtual_festivals f
JOIN (VALUES
  ('livecircuit-summer-fest', 'new-york-city-arena', 28, 35, 'Main Stage'),
  ('livecircuit-summer-fest', 'los-angeles-arena', 72, 40, 'West Stage'),
  ('livecircuit-summer-fest', 'las-vegas-arena', 50, 68, 'Night Dome'),
  ('comedy-weekend', 'buffalo-arena', 40, 45, 'Laugh Lab'),
  ('comedy-weekend', 'boston-arena', 62, 50, 'Late Night'),
  ('animecon-live', 'san-diego-arena', 35, 55, 'Con Hall'),
  ('edm-world', 'las-vegas-arena', 55, 45, 'Bass Temple'),
  ('country-music-festival', 'albany-arena', 48, 42, 'Main Barn'),
  ('global-podcast-expo', 'providence-arena', 50, 50, 'Expo Center')
) AS pin(festival_slug, venue_slug, map_x, map_y, map_label) ON f.slug = pin.festival_slug
JOIN public.venues v ON v.slug = pin.venue_slug
ON CONFLICT DO NOTHING;

INSERT INTO public.festival_days (festival_id, day_date, label, sort_order)
SELECT f.id, d.day_date::date, d.label, d.sort_order
FROM public.virtual_festivals f
JOIN (VALUES
  ('livecircuit-summer-fest', '2026-07-18', 'Day 1 — Opening', 1),
  ('livecircuit-summer-fest', '2026-07-19', 'Day 2 — Peak', 2),
  ('livecircuit-summer-fest', '2026-07-20', 'Day 3 — Finale', 3),
  ('comedy-weekend', '2026-08-08', 'Friday', 1),
  ('comedy-weekend', '2026-08-09', 'Saturday', 2)
) AS d(festival_slug, day_date, label, sort_order) ON f.slug = d.festival_slug
ON CONFLICT (festival_id, day_date) DO NOTHING;

INSERT INTO public.festival_pass_tiers (festival_id, slug, name, description, price_cents, is_vip_upgrade, perks, sort_order)
SELECT f.id, t.slug, t.name, t.description, t.price_cents, t.is_vip, t.perks::jsonb, t.sort_order
FROM public.virtual_festivals f
JOIN (VALUES
  ('livecircuit-summer-fest', 'festival-pass', 'Festival Pass', 'Access all public stages.', 4900, false, '["All stages","Schedule planner"]', 1),
  ('livecircuit-summer-fest', 'vip-upgrade', 'VIP Upgrade', 'Lounges + meet-and-greets.', 12900, true, '["VIP lounges","Meet-and-greets","Early entry"]', 2),
  ('comedy-weekend', 'weekend-pass', 'Weekend Pass', 'Full comedy circuit.', 3500, false, '["All comedy rooms"]', 1)
) AS t(festival_slug, slug, name, description, price_cents, is_vip, perks, sort_order) ON f.slug = t.festival_slug
ON CONFLICT (festival_id, slug) DO NOTHING;

INSERT INTO public.festival_collectibles (festival_id, slug, name, description, rarity, sort_order)
SELECT f.id, c.slug, c.name, c.description, c.rarity, c.sort_order
FROM public.virtual_festivals f
JOIN (VALUES
  ('livecircuit-summer-fest', 'solar-pin', 'Solar Pin', 'Earned with any festival pass.', 'common', 1),
  ('livecircuit-summer-fest', 'headliner-charm', 'Headliner Charm', 'Catch a main stage set.', 'rare', 2),
  ('livecircuit-summer-fest', 'vip-lanyard', 'VIP Lanyard', 'VIP upgrade exclusive.', 'legendary', 3)
) AS c(festival_slug, slug, name, description, rarity, sort_order) ON f.slug = c.festival_slug
ON CONFLICT (festival_id, slug) DO NOTHING;

INSERT INTO public.festival_achievement_defs (festival_id, slug, name, description, criteria, sort_order)
SELECT f.id, a.slug, a.name, a.description, a.criteria::jsonb, a.sort_order
FROM public.virtual_festivals f
JOIN (VALUES
  ('livecircuit-summer-fest', 'pass-holder', 'Pass Holder', 'Purchase any festival pass.', '{"type":"pass"}', 1),
  ('livecircuit-summer-fest', 'stage-hopper', 'Stage Hopper', 'Browse 3+ schedule slots.', '{"type":"slots_viewed","count":3}', 2),
  ('livecircuit-summer-fest', 'vip-insider', 'VIP Insider', 'Upgrade to VIP.', '{"type":"vip_pass"}', 3)
) AS a(festival_slug, slug, name, description, criteria, sort_order) ON f.slug = a.festival_slug
ON CONFLICT (festival_id, slug) DO NOTHING;

-- Summer fest sample schedule (simultaneous slots)
INSERT INTO public.festival_slots (
  festival_id, day_id, venue_id, title, slot_type, starts_at, ends_at, is_vip_only, sort_order
)
SELECT
  f.id,
  fd.id,
  fv.venue_id,
  s.title,
  s.slot_type::public.festival_slot_type,
  s.starts_at::timestamptz,
  s.ends_at::timestamptz,
  s.is_vip,
  s.sort_order
FROM public.virtual_festivals f
JOIN public.festival_days fd ON fd.festival_id = f.id AND fd.day_date = '2026-07-19'
JOIN (VALUES
  ('new-york-city-arena', 'Main Stage Headliner', 'performance', '2026-07-19T20:00:00Z', '2026-07-19T21:30:00Z', false, 1),
  ('los-angeles-arena', 'West Coast Spotlight', 'performance', '2026-07-19T20:00:00Z', '2026-07-19T21:00:00Z', false, 2),
  ('las-vegas-arena', 'Night Dome DJ Set', 'performance', '2026-07-19T20:00:00Z', '2026-07-19T22:00:00Z', false, 3),
  ('new-york-city-arena', 'Artist Meet-and-Greet', 'meet_greet', '2026-07-19T18:00:00Z', '2026-07-19T19:00:00Z', true, 4)
) AS s(venue_slug, title, slot_type, starts_at, ends_at, is_vip, sort_order)
JOIN public.venues v ON v.slug = s.venue_slug
JOIN public.festival_venues fv ON fv.festival_id = f.id AND fv.venue_id = v.id
WHERE f.slug = 'livecircuit-summer-fest';

ALTER TABLE public.virtual_festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_pass_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_pass_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_collectibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_festival_collectibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_achievement_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_festival_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Festivals public read" ON public.virtual_festivals FOR SELECT USING (true);
CREATE POLICY "Festival venues public read" ON public.festival_venues FOR SELECT USING (true);
CREATE POLICY "Festival days public read" ON public.festival_days FOR SELECT USING (true);
CREATE POLICY "Festival slots public read" ON public.festival_slots FOR SELECT USING (true);
CREATE POLICY "Festival pass tiers public read" ON public.festival_pass_tiers FOR SELECT USING (true);
CREATE POLICY "Festival collectibles public read" ON public.festival_collectibles FOR SELECT USING (true);
CREATE POLICY "Festival achievements public read" ON public.festival_achievement_defs FOR SELECT USING (true);
CREATE POLICY "Festival leaderboard public read" ON public.festival_leaderboard_entries FOR SELECT USING (true);

CREATE POLICY "Users read own festival passes" ON public.festival_pass_purchases
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own festival passes" ON public.festival_pass_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own festival collectibles" ON public.user_festival_collectibles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users earn festival collectibles" ON public.user_festival_collectibles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read festival collectibles earned" ON public.user_festival_collectibles
  FOR SELECT USING (true);

CREATE POLICY "Users read own festival achievements" ON public.user_festival_achievements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users earn festival achievements" ON public.user_festival_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin virtual festivals" ON public.virtual_festivals
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
CREATE POLICY "Admin festival passes" ON public.festival_pass_purchases
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
CREATE POLICY "Admin festival leaderboard" ON public.festival_leaderboard_entries
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
