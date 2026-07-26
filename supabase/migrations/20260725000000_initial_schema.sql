-- LiveCircuit consolidated initial schema
-- Generated from 35 archived migrations on 2026-07-26
-- Source: supabase/migrations_archive/
-- Includes extensions, enums, tables, indexes, functions, triggers, RLS, storage, realtime, and seed data.

-- ---------------------------------------------------------------------------
-- 20250720000000_initial_schema.sql
-- ---------------------------------------------------------------------------

-- LiveCircuit initial schema
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE public.user_role AS ENUM ('fan', 'artist', 'admin');
CREATE TYPE public.artist_category AS ENUM (
  'music', 'comedy', 'podcast', 'author', 'gaming', 'dj', 'theater',
  'magic', 'fitness', 'cooking', 'education', 'religion', 'motivational', 'other'
);
CREATE TYPE public.event_status AS ENUM ('draft', 'scheduled', 'live', 'ended', 'cancelled');
CREATE TYPE public.tour_status AS ENUM ('draft', 'published', 'completed', 'cancelled');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');
CREATE TYPE public.order_type AS ENUM ('ticket', 'merch', 'tip', 'vip', 'digital');
CREATE TYPE public.stream_provider AS ENUM ('placeholder', 'agora', 'livekit', 'mux');
CREATE TYPE public.stream_status AS ENUM ('idle', 'starting', 'live', 'ended', 'error');
CREATE TYPE public.notification_type AS ENUM (
  'artist_live', 'tour_announced', 'new_merch', 'vip_event', 'friend_attending',
  'ticket_reminder', 'price_drop', 'sold_out', 'follow', 'comment', 'system'
);
CREATE TYPE public.report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
CREATE TYPE public.moderation_action AS ENUM ('warn', 'mute', 'ban', 'delete_message', 'pin');

-- Geography reference
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code CHAR(2) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_id, code)
);

CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID REFERENCES public.states(id) ON DELETE SET NULL,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_id, slug)
);

CREATE TABLE public.genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'fan',
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  country_id UUID REFERENCES public.countries(id),
  state_id UUID REFERENCES public.states(id),
  city_id UUID REFERENCES public.cities(id),
  date_of_birth DATE,
  gender TEXT,
  favorite_genres UUID[] DEFAULT '{}',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  stage_name TEXT NOT NULL,
  banner_url TEXT,
  category public.artist_category NOT NULL DEFAULT 'music',
  verified BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  monthly_listeners INTEGER NOT NULL DEFAULT 0,
  follower_count INTEGER NOT NULL DEFAULT 0,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  donation_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.artist_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, genre_id)
);

CREATE TABLE public.followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fan_id, artist_id)
);

CREATE TABLE public.tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  status public.tour_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, slug)
);

CREATE TABLE public.tour_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  city_id UUID REFERENCES public.cities(id),
  virtual_location_label TEXT NOT NULL,
  stop_order INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  banner_url TEXT,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 1000,
  ticket_price_cents INTEGER NOT NULL DEFAULT 0,
  vip_price_cents INTEGER,
  vip_capacity INTEGER,
  has_meet_greet BOOLEAN NOT NULL DEFAULT false,
  expected_duration_minutes INTEGER NOT NULL DEFAULT 90,
  merch_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_stop_id UUID NOT NULL UNIQUE REFERENCES public.tour_stops(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  status public.event_status NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  peak_viewers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, slug)
);

CREATE TABLE public.streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  provider public.stream_provider NOT NULL DEFAULT 'placeholder',
  status public.stream_status NOT NULL DEFAULT 'idle',
  external_stream_id TEXT,
  playback_url TEXT,
  ingest_url TEXT,
  stream_key TEXT,
  recording_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID,
  tier TEXT NOT NULL DEFAULT 'general',
  price_cents INTEGER NOT NULL,
  qr_code TEXT,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, tier)
);

CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL DEFAULT 'physical',
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  image_urls TEXT[] DEFAULT '{}',
  inventory_count INTEGER,
  is_vip_exclusive BOOLEAN NOT NULL DEFAULT false,
  is_digital BOOLEAN NOT NULL DEFAULT false,
  digital_download_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, slug)
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  order_type public.order_type NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ADD CONSTRAINT tickets_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vip_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  price_cents INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, artist_id)
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  is_vip_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (artist_id IS NOT NULL AND event_id IS NULL) OR
    (artist_id IS NULL AND event_id IS NOT NULL)
  )
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status public.report_status NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  action public.moderation_action NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_city ON public.profiles(city_id);
CREATE INDEX idx_profiles_state ON public.profiles(state_id);
CREATE INDEX idx_profiles_country ON public.profiles(country_id);
CREATE INDEX idx_artists_slug ON public.artists(slug);
CREATE INDEX idx_artists_featured ON public.artists(featured) WHERE featured = true;
CREATE INDEX idx_tours_artist ON public.tours(artist_id);
CREATE INDEX idx_tour_stops_scheduled ON public.tour_stops(scheduled_at);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_scheduled ON public.events(scheduled_at);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_artist ON public.orders(artist_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_followers_artist ON public.followers(artist_id);
CREATE INDEX idx_chat_messages_event ON public.chat_messages(event_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'countries', 'states', 'cities', 'genres', 'profiles', 'admins', 'artists',
      'artist_genres', 'followers', 'tours', 'tour_stops', 'events', 'streams',
      'tickets', 'product_categories', 'products', 'orders', 'order_items', 'tips',
      'vip_memberships', 'chat_messages', 'reactions', 'comments', 'likes',
      'notifications', 'achievements', 'user_achievements', 'reviews', 'reports',
      'moderation_logs', 'analytics_events', 'playlists', 'playlist_items'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t
    );
  END LOOP;
END $$;

-- (superseded handle_new_user removed; see auth_roles section)

-- (on_auth_user_created trigger moved to auth_roles section)

-- Fan heat map aggregation view
CREATE OR REPLACE VIEW public.artist_fan_locations AS
SELECT
  f.artist_id,
  p.country_id,
  p.state_id,
  p.city_id,
  COUNT(*) AS fan_count
FROM public.followers f
JOIN public.profiles p ON p.id = f.fan_id
GROUP BY f.artist_id, p.country_id, p.state_id, p.city_id;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read countries" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Public read states" ON public.states FOR SELECT USING (true);
CREATE POLICY "Public read cities" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Public read genres" ON public.genres FOR SELECT USING (true);

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Artists public read" ON public.artists FOR SELECT USING (true);
CREATE POLICY "Artist owner update" ON public.artists FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Authenticated create artist" ON public.artists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Published tours readable" ON public.tours FOR SELECT
  USING (status = 'published' OR EXISTS (
    SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid()
  ));
CREATE POLICY "Artist manages tours" ON public.tours FOR ALL
  USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid()));

CREATE POLICY "Tour stops readable" ON public.tour_stops FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tours t
    JOIN public.artists a ON a.id = t.artist_id
    WHERE t.id = tour_id AND (t.status = 'published' OR a.user_id = auth.uid())
  )
);

CREATE POLICY "Events public read" ON public.events FOR SELECT USING (true);
CREATE POLICY "Artist manages events" ON public.events FOR ALL
  USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid()));

CREATE POLICY "Streams public read when live" ON public.streams FOR SELECT USING (true);

CREATE POLICY "Own tickets" ON public.tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert own tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Products public read" ON public.products FOR SELECT USING (active = true);
CREATE POLICY "Artist manages products" ON public.products FOR ALL
  USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid()));

CREATE POLICY "Own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tips public read for artist" ON public.tips FOR SELECT USING (true);
CREATE POLICY "Insert tips" ON public.tips FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "VIP read own or artist" ON public.vip_memberships FOR SELECT
  USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Chat read" ON public.chat_messages FOR SELECT USING (NOT is_deleted);
CREATE POLICY "Chat insert auth" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Followers read" ON public.followers FOR SELECT USING (true);
CREATE POLICY "Follow insert" ON public.followers FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Unfollow delete" ON public.followers FOR DELETE USING (auth.uid() = fan_id);

-- Seed genres
INSERT INTO public.genres (slug, name) VALUES
  ('pop', 'Pop'), ('rock', 'Rock'), ('hip-hop', 'Hip-Hop'), ('r-and-b', 'R&B'),
  ('electronic', 'Electronic'), ('country', 'Country'), ('jazz', 'Jazz'),
  ('stand-up', 'Stand-Up'), ('improv', 'Improv'), ('true-crime', 'True Crime'),
  ('interview', 'Interview'), ('fiction', 'Fiction'), ('non-fiction', 'Non-Fiction')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.countries (code, name) VALUES ('US', 'United States') ON CONFLICT (code) DO NOTHING;

INSERT INTO public.states (country_id, code, name)
SELECT c.id, v.code, v.name FROM public.countries c
CROSS JOIN (VALUES
  ('CA', 'California'), ('TX', 'Texas'), ('FL', 'Florida'), ('NY', 'New York'),
  ('MA', 'Massachusetts'), ('IL', 'Illinois')
) AS v(code, name)
WHERE c.code = 'US'
ON CONFLICT DO NOTHING;

INSERT INTO public.cities (country_id, state_id, name, slug, latitude, longitude)
SELECT c.id, s.id, v.name, v.slug, v.lat, v.lng
FROM public.countries c
CROSS JOIN (VALUES
  ('Los Angeles', 'los-angeles', 'CA', 34.0522, -118.2437),
  ('Boston', 'boston', 'MA', 42.3601, -71.0589),
  ('New York', 'new-york', 'NY', 40.7128, -74.006),
  ('Chicago', 'chicago', 'IL', 41.8781, -87.6298),
  ('Dallas', 'dallas', 'TX', 32.7767, -96.797),
  ('Miami', 'miami', 'FL', 25.7617, -80.1918)
) AS v(name, slug, state_code, lat, lng)
JOIN public.states s ON s.country_id = c.id AND s.code = v.state_code
WHERE c.code = 'US'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 20250721000000_rls_hardening.sql
-- ---------------------------------------------------------------------------

-- Milestone 1: RLS hardening and tour stop mutations for artists

-- Tour stops: artist can manage stops on their tours
CREATE POLICY "Artist manages tour stops" ON public.tour_stops
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tours t
      JOIN public.artists a ON a.id = t.artist_id
      WHERE t.id = tour_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tours t
      JOIN public.artists a ON a.id = t.artist_id
      WHERE t.id = tour_id AND a.user_id = auth.uid()
    )
  );

-- Reactions
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions read" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Reactions insert auth" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments public read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Comments insert own" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Comments update own" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes read" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Likes insert" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Likes delete own" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Reviews insert own" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reviews update own" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports insert auth" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reports read own" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Order items (read via order ownership)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order items via order" ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

-- Notifications: users cannot forge notifications for others
CREATE POLICY "Notifications insert own" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Artist genres
ALTER TABLE public.artist_genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artist genres read" ON public.artist_genres FOR SELECT USING (true);
CREATE POLICY "Artist manages genres" ON public.artist_genres FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

-- Product categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories read" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Artist manages categories" ON public.product_categories FOR ALL
  USING (
    artist_id IS NULL OR EXISTS (
      SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

-- Profiles: allow insert for trigger + self (signup edge cases)
CREATE POLICY "Service profile insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Storage buckets policy placeholder comment — configure in Supabase dashboard:
-- avatars (public read, auth upload own path)
-- artist-media, merch-images

-- ---------------------------------------------------------------------------
-- 20250721000001_auth_roles.sql
-- ---------------------------------------------------------------------------

-- Auth: roles on signup, artist bootstrap, role escalation guard

CREATE OR REPLACE FUNCTION public.slugify_stage_name(input text)
RETURNS text AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(input, 'artist')), '[^a-z0-9]+', '-', 'g'));
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.create_artist_for_user(p_user_id uuid, p_stage_name text)
RETURNS void AS $$
DECLARE
  base_slug text;
  final_slug text;
  suffix int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.artists WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  base_slug := public.slugify_stage_name(p_stage_name);
  IF base_slug = '' THEN
    base_slug := 'artist';
  END IF;
  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM public.artists WHERE slug = final_slug) LOOP
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  END LOOP;

  INSERT INTO public.artists (user_id, slug, stage_name, category)
  VALUES (
    p_user_id,
    final_slug,
    coalesce(nullif(trim(p_stage_name), ''), 'New Artist'),
    'music'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  intended text;
  resolved_role public.user_role;
  display text;
BEGIN
  intended := lower(coalesce(NEW.raw_user_meta_data->>'intended_role', 'fan'));
  resolved_role := CASE
    WHEN intended IN ('fan', 'artist', 'admin') THEN intended::public.user_role
    ELSE 'fan'::public.user_role
  END;

  display := coalesce(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, display_name, avatar_url, role)
  VALUES (NEW.id, display, NEW.raw_user_meta_data->>'avatar_url', resolved_role);

  IF resolved_role = 'artist' THEN
    PERFORM public.create_artist_for_user(NEW.id, display);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.on_profile_role_artist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'artist' AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM NEW.role) THEN
    PERFORM public.create_artist_for_user(NEW.id, NEW.display_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_artist_role ON public.profiles;
CREATE TRIGGER on_profile_artist_role
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.on_profile_role_artist();

CREATE OR REPLACE FUNCTION public.profiles_prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_role_guard ON public.profiles;
CREATE TRIGGER profiles_role_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_prevent_role_escalation();

-- Admins table: promote profile when admin row exists (service role only inserts)
CREATE OR REPLACE FUNCTION public.sync_profile_admin_from_admins()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET role = 'admin' WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_admin_promote ON public.admins;
CREATE TRIGGER on_admin_promote
  AFTER INSERT ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_admin_from_admins();

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read own" ON public.admins FOR SELECT USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 20250721000002_profiles_and_media.sql
-- ---------------------------------------------------------------------------

-- Artist media, verification requests, follower counts, storage

CREATE TABLE IF NOT EXISTS public.artist_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('gallery', 'video', 'album')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artist_media_artist ON public.artist_media(artist_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_artist ON public.verification_requests(artist_id);

ALTER TABLE public.artist_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artist media public read" ON public.artist_media FOR SELECT USING (true);
CREATE POLICY "Artist manages media" ON public.artist_media FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Verification read own" ON public.verification_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Verification insert own" ON public.verification_requests FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.sync_artist_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.artists SET follower_count = follower_count + 1 WHERE id = NEW.artist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.artists SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.artist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_follower_change ON public.followers;
CREATE TRIGGER on_follower_change
  AFTER INSERT OR DELETE ON public.followers
  FOR EACH ROW EXECUTE FUNCTION public.sync_artist_follower_count();

CREATE TRIGGER set_updated_at_artist_media
  BEFORE UPDATE ON public.artist_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_verification_requests
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage buckets (Supabase Storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('artist-media', 'artist-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar upload own folder" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatar update own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artist media public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'artist-media');

CREATE POLICY "Artist media upload own" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'artist-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Artist media update own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'artist-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ---------------------------------------------------------------------------
-- 20250721000003_artist_analytics_rls.sql
-- ---------------------------------------------------------------------------

-- Artists can read commerce tied to their artist_id (dashboard analytics)

CREATE POLICY "Artist reads own orders" ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = orders.artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Artist reads tickets for their events" ON public.tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = tickets.event_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Artist reads tips received" ON public.tips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = tips.artist_id AND a.user_id = auth.uid()
    )
  );

-- Drop overly broad tip read if it conflicts; keep public read for fans viewing tips on events
-- (multiple SELECT policies OR together in Postgres RLS)

-- ---------------------------------------------------------------------------
-- 20250721000004_tour_events_streams.sql
-- ---------------------------------------------------------------------------

-- Milestone 5: artists can attach placeholder streams when creating events from tour stops

CREATE POLICY "Artist manages streams for own events" ON public.streams
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 20250721000005_checkout_order_items.sql
-- ---------------------------------------------------------------------------

-- Milestone 6: allow buyers to insert order line items on their pending orders

CREATE POLICY "Insert order items on own order" ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 20250721000006_live_event_infrastructure.sql
-- ---------------------------------------------------------------------------

-- Milestone 7: live room mutes and moderation updates

CREATE TABLE public.event_chat_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_chat_mutes_event ON public.event_chat_mutes(event_id);

ALTER TABLE public.event_chat_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mutes readable by artist or self" ON public.event_chat_mutes
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Artist mutes on own events" ON public.event_chat_mutes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Artist unmutes on own events" ON public.event_chat_mutes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Artist soft-delete chat on own events" ON public.chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.artists a ON a.id = e.artist_id
      WHERE e.id = event_id AND a.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Moderation logs insert staff" ON public.moderation_logs
  FOR INSERT WITH CHECK (
    auth.uid() = admin_id
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR EXISTS (
        SELECT 1 FROM public.chat_messages cm
        JOIN public.events e ON e.id = cm.event_id
        JOIN public.artists a ON a.id = e.artist_id
        WHERE cm.id = message_id AND a.user_id = auth.uid()
      )
      OR (
        message_id IS NULL
        AND target_user_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.events e
          JOIN public.artists a ON a.id = e.artist_id
          WHERE a.user_id = auth.uid()
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 20250721000007_messaging_merch_notifications.sql
-- ---------------------------------------------------------------------------

-- Milestone 9: fan–artist messaging

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, fan_id)
);

CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_fan ON public.conversations(fan_id, last_message_at DESC);
CREATE INDEX idx_conversations_artist ON public.conversations(artist_id, last_message_at DESC);
CREATE INDEX idx_direct_messages_conversation ON public.direct_messages(conversation_id, created_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants read" ON public.conversations
  FOR SELECT USING (
    auth.uid() = fan_id
    OR EXISTS (
      SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Fan starts conversation" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Participants update conversation timestamp" ON public.conversations
  FOR UPDATE USING (
    auth.uid() = fan_id
    OR EXISTS (
      SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Direct messages read" ON public.direct_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          c.fan_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.artists a WHERE a.id = c.artist_id AND a.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Direct messages insert" ON public.direct_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          c.fan_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.artists a WHERE a.id = c.artist_id AND a.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Recipient marks read" ON public.direct_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          c.fan_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.artists a WHERE a.id = c.artist_id AND a.user_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Supabase Realtime publication (consolidated)
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_chat_mutes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ---------------------------------------------------------------------------
-- 20250721000008_admin_moderation.sql
-- ---------------------------------------------------------------------------

-- Milestone 10: admin moderation, verification, order refunds

CREATE POLICY "Admin reads verification requests" ON public.verification_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admin updates verification requests" ON public.verification_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admin reads reports" ON public.reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admin updates reports" ON public.reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admin reads orders" ON public.orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admin updates orders" ON public.orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admin updates artists" ON public.artists
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admin mod chat messages" ON public.chat_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admin deletes tickets" ON public.tickets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 20250721000009_venue_network_sponsorship.sql
-- ---------------------------------------------------------------------------

-- Milestone 1 (Venue Network): schema, RLS, seed venues & reference data

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.venue_loyalty_level AS ENUM (
  'bronze',
  'silver',
  'gold',
  'diamond'
);

CREATE TYPE public.sponsorship_product AS ENUM (
  'venue_naming_rights',
  'digital_billboard',
  'homepage_banner',
  'concourse_booth',
  'pre_show_ad',
  'vip_lounge',
  'exclusive_promotion',
  'merch_sponsorship',
  'category_sponsorship',
  'founding_sponsor'
);

CREATE TYPE public.sponsor_member_role AS ENUM (
  'owner',
  'analyst',
  'viewer'
);

CREATE TYPE public.sponsor_campaign_status AS ENUM (
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled'
);

CREATE TYPE public.concourse_shop_kind AS ENUM (
  'merchandise',
  'food_sponsor',
  'advertisement_kiosk',
  'photo_booth',
  'meet_and_greet',
  'event_board',
  'venue_directory',
  'local_business',
  'charity',
  'information_desk',
  'interactive'
);

CREATE TYPE public.loyalty_transaction_reason AS ENUM (
  'attendance',
  'merchandise',
  'check_in',
  'referral',
  'artist_support',
  'review',
  'share',
  'admin_adjustment',
  'reward_redemption'
);

CREATE TYPE public.venue_post_kind AS ENUM (
  'discussion',
  'achievement',
  'ranking'
);

-- ---------------------------------------------------------------------------
-- Venue taxonomy & venues
-- ---------------------------------------------------------------------------

CREATE TABLE public.venue_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon_key TEXT NOT NULL DEFAULT 'arena',
  description TEXT,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  landing_template_key TEXT NOT NULL DEFAULT 'default',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  state_code TEXT,
  country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  state_id UUID REFERENCES public.states(id) ON DELETE SET NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  venue_type_id UUID NOT NULL REFERENCES public.venue_types(id) ON DELETE RESTRICT,
  capacity INTEGER NOT NULL DEFAULT 50000,
  soft_capacity_limit INTEGER,
  description TEXT,
  banner_url TEXT,
  hero_image_url TEXT,
  theme_palette JSONB NOT NULL DEFAULT '{}'::jsonb,
  popularity_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
  current_visitors INTEGER NOT NULL DEFAULT 0,
  follower_count INTEGER NOT NULL DEFAULT 0,
  featured_sponsor_org_id UUID,
  founding_sponsor_org_id UUID,
  vr_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  concourse_layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  weather_placeholder JSONB NOT NULL DEFAULT '{}'::jsonb,
  statistics JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venues_country ON public.venues(country_id);
CREATE INDEX idx_venues_state ON public.venues(state_id);
CREATE INDEX idx_venues_type ON public.venues(venue_type_id);
CREATE INDEX idx_venues_popularity ON public.venues(popularity_score DESC) WHERE is_active = true;
CREATE INDEX idx_venues_region ON public.venues(region);

CREATE TABLE public.venue_featured_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  featured_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, artist_id)
);

CREATE TABLE public.venue_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  assets JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_palette JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.venue_theme_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES public.venue_themes(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_venue_one_active_theme
  ON public.venue_theme_assignments(venue_id)
  WHERE is_active = true AND ends_at IS NULL;

CREATE INDEX idx_venue_theme_assignments_window
  ON public.venue_theme_assignments(venue_id, starts_at, ends_at);

-- Simultaneous events: optional venue link (many events per venue)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_room_label TEXT;

CREATE INDEX idx_events_venue_status ON public.events(venue_id, status)
  WHERE venue_id IS NOT NULL;

CREATE INDEX idx_events_venue_scheduled ON public.events(venue_id, scheduled_at DESC)
  WHERE venue_id IS NOT NULL;

CREATE INDEX idx_events_venue_live ON public.events(venue_id)
  WHERE venue_id IS NOT NULL AND status = 'live';

-- ---------------------------------------------------------------------------
-- Sponsors
-- ---------------------------------------------------------------------------

CREATE TABLE public.sponsor_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  billing_email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sponsor_organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.sponsor_member_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_sponsor_members_user ON public.sponsor_organization_members(user_id);

ALTER TABLE public.venues
  ADD CONSTRAINT venues_featured_sponsor_fkey
  FOREIGN KEY (featured_sponsor_org_id) REFERENCES public.sponsor_organizations(id) ON DELETE SET NULL;

ALTER TABLE public.venues
  ADD CONSTRAINT venues_founding_sponsor_fkey
  FOREIGN KEY (founding_sponsor_org_id) REFERENCES public.sponsor_organizations(id) ON DELETE SET NULL;

CREATE TABLE public.venue_sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  product public.sponsorship_product NOT NULL,
  display_name TEXT,
  is_founding_sponsor BOOLEAN NOT NULL DEFAULT false,
  priority_renewal BOOLEAN NOT NULL DEFAULT false,
  launch_pricing_cents INTEGER,
  contract_starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contract_ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  history_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_venue_one_founding_sponsor
  ON public.venue_sponsorships(venue_id)
  WHERE is_founding_sponsor = true AND is_active = true;

CREATE INDEX idx_venue_sponsorships_org ON public.venue_sponsorships(organization_id);
CREATE INDEX idx_venue_sponsorships_venue ON public.venue_sponsorships(venue_id, is_active);

CREATE TABLE public.sponsor_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.sponsor_organizations(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status public.sponsor_campaign_status NOT NULL DEFAULT 'draft',
  budget_cents INTEGER,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  targeting JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sponsor_campaigns_org ON public.sponsor_campaigns(organization_id, status);

CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  creative_type TEXT NOT NULL DEFAULT 'image',
  asset_url TEXT,
  click_url TEXT,
  html_snippet TEXT,
  animation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_interactive BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_advertisements_campaign ON public.advertisements(campaign_id);

CREATE TABLE public.billboard_location_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.venue_billboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  location_type_id UUID NOT NULL REFERENCES public.billboard_location_types(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  zone_key TEXT,
  max_simultaneous_ads INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, slug)
);

CREATE INDEX idx_venue_billboards_venue ON public.venue_billboards(venue_id) WHERE is_active = true;

CREATE TABLE public.advertisement_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  billboard_id UUID NOT NULL REFERENCES public.venue_billboards(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_schedules_billboard_active
  ON public.advertisement_schedules(billboard_id, starts_at, ends_at)
  WHERE is_active = true;

CREATE TABLE public.sponsor_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_bps INTEGER,
  max_redemptions INTEGER,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, code)
);

CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.sponsor_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Concourse
-- ---------------------------------------------------------------------------

CREATE TABLE public.concourse_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  sponsor_organization_id UUID REFERENCES public.sponsor_organizations(id) ON DELETE SET NULL,
  kind public.concourse_shop_kind NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  zone JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, slug)
);

CREATE INDEX idx_concourse_shops_venue ON public.concourse_shops(venue_id, sort_order);

CREATE TABLE public.concourse_shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.concourse_shops(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  external_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Community, reviews, loyalty
-- ---------------------------------------------------------------------------

CREATE TABLE public.venue_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, user_id)
);

CREATE INDEX idx_venue_followers_user ON public.venue_followers(user_id);

CREATE TABLE public.venue_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, user_id)
);

CREATE TABLE public.venue_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind public.venue_post_kind NOT NULL DEFAULT 'discussion',
  title TEXT,
  body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_posts_venue ON public.venue_posts(venue_id, created_at DESC);

CREATE TABLE public.venue_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.venue_loyalty_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  level public.venue_loyalty_level NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, user_id)
);

CREATE TABLE public.venue_loyalty_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_profile_id UUID NOT NULL REFERENCES public.venue_loyalty_profiles(id) ON DELETE CASCADE,
  delta_points INTEGER NOT NULL,
  reason public.loyalty_transaction_reason NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_loyalty_ledger_profile ON public.venue_loyalty_ledger(loyalty_profile_id, created_at DESC);

CREATE TABLE public.venue_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  concourse_shop_id UUID REFERENCES public.concourse_shops(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_check_ins_venue_day ON public.venue_check_ins(venue_id, created_at DESC);

CREATE TABLE public.venue_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, slug)
);

CREATE TABLE public.user_venue_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id UUID NOT NULL REFERENCES public.venue_badges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (badge_id, user_id)
);

CREATE TABLE public.venue_leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  category TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, period_key, category)
);

-- ---------------------------------------------------------------------------
-- Analytics (rollup + raw ad telemetry)
-- ---------------------------------------------------------------------------

CREATE TABLE public.venue_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  bucket_date DATE NOT NULL,
  daily_visitors INTEGER NOT NULL DEFAULT 0,
  monthly_visitors_roll INTEGER NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  vip_purchases INTEGER NOT NULL DEFAULT 0,
  merchandise_cents BIGINT NOT NULL DEFAULT 0,
  avg_visit_seconds INTEGER NOT NULL DEFAULT 0,
  peak_concurrent INTEGER NOT NULL DEFAULT 0,
  repeat_visitor_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
  geo_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  heat_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_event_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, bucket_date)
);

CREATE INDEX idx_venue_analytics_daily_venue ON public.venue_analytics_daily(venue_id, bucket_date DESC);

CREATE TABLE public.sponsor_campaign_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  bucket_date DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  coupon_downloads INTEGER NOT NULL DEFAULT 0,
  avg_session_seconds INTEGER NOT NULL DEFAULT 0,
  revenue_attribution_cents BIGINT NOT NULL DEFAULT 0,
  demographics JSONB NOT NULL DEFAULT '{}'::jsonb,
  geo_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_event_ids UUID[] NOT NULL DEFAULT '{}',
  top_artist_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, bucket_date)
);

CREATE TABLE public.advertisement_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  billboard_id UUID REFERENCES public.venue_billboards(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_impressions_ad_time ON public.advertisement_impressions(advertisement_id, created_at DESC);
CREATE INDEX idx_ad_impressions_venue_time ON public.advertisement_impressions(venue_id, created_at DESC);

CREATE TABLE public.advertisement_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  billboard_id UUID REFERENCES public.venue_billboards(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_clicks_ad_time ON public.advertisement_clicks(advertisement_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_sponsor_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sponsor_organization_members m
    WHERE m.organization_id = org_id AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_profile()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_venue_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.venues SET follower_count = follower_count + 1 WHERE id = NEW.venue_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.venues SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.venue_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER venue_followers_count_ins
  AFTER INSERT ON public.venue_followers
  FOR EACH ROW EXECUTE FUNCTION public.sync_venue_follower_count();

CREATE TRIGGER venue_followers_count_del
  AFTER DELETE ON public.venue_followers
  FOR EACH ROW EXECUTE FUNCTION public.sync_venue_follower_count();

-- updated_at triggers
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'venue_types', 'venues', 'venue_featured_artists', 'venue_themes', 'venue_theme_assignments',
      'sponsor_organizations', 'sponsor_organization_members', 'venue_sponsorships',
      'sponsor_campaigns', 'advertisements', 'billboard_location_types', 'venue_billboards',
      'advertisement_schedules', 'sponsor_coupons', 'concourse_shops', 'concourse_shop_products',
      'venue_followers', 'venue_reviews', 'venue_posts', 'venue_announcements',
      'venue_loyalty_profiles', 'venue_badges', 'venue_analytics_daily',
      'sponsor_campaign_metrics_daily'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

ALTER TABLE public.venue_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_featured_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_theme_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billboard_location_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_billboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concourse_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concourse_shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_loyalty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_loyalty_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_venue_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_campaign_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_clicks ENABLE ROW LEVEL SECURITY;

-- Public catalog
CREATE POLICY "Venue types public read" ON public.venue_types FOR SELECT USING (true);
CREATE POLICY "Billboard location types public read" ON public.billboard_location_types FOR SELECT USING (true);
CREATE POLICY "Venue themes public read" ON public.venue_themes FOR SELECT USING (true);

CREATE POLICY "Venues public read active" ON public.venues FOR SELECT USING (is_active = true OR public.is_admin_profile());
CREATE POLICY "Admin manages venues" ON public.venues FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Venue featured artists public read" ON public.venue_featured_artists FOR SELECT USING (true);
CREATE POLICY "Admin manages venue featured artists" ON public.venue_featured_artists FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Venue theme assignments public read" ON public.venue_theme_assignments FOR SELECT USING (true);
CREATE POLICY "Admin manages venue theme assignments" ON public.venue_theme_assignments FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- Sponsors
CREATE POLICY "Sponsor org read members or admin" ON public.sponsor_organizations FOR SELECT
  USING (
    public.is_admin_profile()
    OR public.is_sponsor_org_member(id)
  );
CREATE POLICY "Admin manages sponsor orgs" ON public.sponsor_organizations FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Sponsor members read own membership" ON public.sponsor_organization_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_sponsor_org_member(organization_id) OR public.is_admin_profile());
CREATE POLICY "Admin manages sponsor members" ON public.sponsor_organization_members FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Venue sponsorships public read active" ON public.venue_sponsorships FOR SELECT
  USING (is_active = true OR public.is_admin_profile() OR public.is_sponsor_org_member(organization_id));
CREATE POLICY "Admin manages venue sponsorships" ON public.venue_sponsorships FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Sponsor campaigns org read" ON public.sponsor_campaigns FOR SELECT
  USING (public.is_admin_profile() OR public.is_sponsor_org_member(organization_id));
CREATE POLICY "Sponsor org manages campaigns" ON public.sponsor_campaigns FOR ALL
  USING (public.is_sponsor_org_member(organization_id) OR public.is_admin_profile())
  WITH CHECK (public.is_sponsor_org_member(organization_id) OR public.is_admin_profile());

CREATE POLICY "Advertisements org read" ON public.advertisements FOR SELECT
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.sponsor_campaigns c
      WHERE c.id = campaign_id AND public.is_sponsor_org_member(c.organization_id)
    )
    OR (is_active = true)
  );
CREATE POLICY "Sponsor org manages advertisements" ON public.advertisements FOR ALL
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.sponsor_campaigns c
      WHERE c.id = campaign_id AND public.is_sponsor_org_member(c.organization_id)
    )
  )
  WITH CHECK (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.sponsor_campaigns c
      WHERE c.id = campaign_id AND public.is_sponsor_org_member(c.organization_id)
    )
  );

CREATE POLICY "Venue billboards public read" ON public.venue_billboards FOR SELECT USING (is_active = true OR public.is_admin_profile());
CREATE POLICY "Admin manages venue billboards" ON public.venue_billboards FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Ad schedules public read active" ON public.advertisement_schedules FOR SELECT
  USING (is_active = true OR public.is_admin_profile());
CREATE POLICY "Sponsor manages ad schedules" ON public.advertisement_schedules FOR ALL
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.advertisements a
      JOIN public.sponsor_campaigns c ON c.id = a.campaign_id
      WHERE a.id = advertisement_id AND public.is_sponsor_org_member(c.organization_id)
    )
  )
  WITH CHECK (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.advertisements a
      JOIN public.sponsor_campaigns c ON c.id = a.campaign_id
      WHERE a.id = advertisement_id AND public.is_sponsor_org_member(c.organization_id)
    )
  );

CREATE POLICY "Coupons public read active" ON public.sponsor_coupons FOR SELECT USING (true);
CREATE POLICY "Sponsor manages coupons" ON public.sponsor_coupons FOR ALL
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.sponsor_campaigns c
      WHERE c.id = campaign_id AND public.is_sponsor_org_member(c.organization_id)
    )
  )
  WITH CHECK (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.sponsor_campaigns c
      WHERE c.id = campaign_id AND public.is_sponsor_org_member(c.organization_id)
    )
  );

CREATE POLICY "Coupon redemptions read own" ON public.coupon_redemptions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin_profile());
CREATE POLICY "Coupon redemptions insert own" ON public.coupon_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Concourse
CREATE POLICY "Concourse shops public read" ON public.concourse_shops FOR SELECT USING (is_active = true OR public.is_admin_profile());
CREATE POLICY "Admin manages concourse shops" ON public.concourse_shops FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Concourse shop products public read" ON public.concourse_shop_products FOR SELECT USING (true);
CREATE POLICY "Admin manages concourse shop products" ON public.concourse_shop_products FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- Community
CREATE POLICY "Venue followers read" ON public.venue_followers FOR SELECT USING (true);
CREATE POLICY "Venue followers insert own" ON public.venue_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Venue followers update own" ON public.venue_followers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Venue followers delete own" ON public.venue_followers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Venue reviews public read" ON public.venue_reviews FOR SELECT USING (true);
CREATE POLICY "Venue reviews insert own" ON public.venue_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Venue reviews update own" ON public.venue_reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Venue posts public read" ON public.venue_posts FOR SELECT USING (true);
CREATE POLICY "Venue posts insert auth" ON public.venue_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Venue posts update own" ON public.venue_posts FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_profile());

CREATE POLICY "Venue announcements public read" ON public.venue_announcements FOR SELECT USING (true);
CREATE POLICY "Admin manages venue announcements" ON public.venue_announcements FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Venue loyalty read own" ON public.venue_loyalty_profiles FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin_profile());
CREATE POLICY "Venue loyalty insert own" ON public.venue_loyalty_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Venue loyalty ledger read own" ON public.venue_loyalty_ledger FOR SELECT
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.venue_loyalty_profiles p
      WHERE p.id = loyalty_profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Venue check ins insert own" ON public.venue_check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Venue check ins read own" ON public.venue_check_ins FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin_profile());

CREATE POLICY "Venue badges public read" ON public.venue_badges FOR SELECT USING (true);
CREATE POLICY "Admin manages venue badges" ON public.venue_badges FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "User venue badges read" ON public.user_venue_badges FOR SELECT USING (true);
CREATE POLICY "User venue badges insert own" ON public.user_venue_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Venue leaderboards public read" ON public.venue_leaderboard_snapshots FOR SELECT USING (true);
CREATE POLICY "Admin manages venue leaderboards" ON public.venue_leaderboard_snapshots FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Venue analytics admin and sponsor" ON public.venue_analytics_daily FOR SELECT
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.venue_sponsorships vs
      WHERE vs.venue_id = venue_analytics_daily.venue_id
        AND vs.is_active = true
        AND public.is_sponsor_org_member(vs.organization_id)
    )
  );
CREATE POLICY "Admin manages venue analytics daily" ON public.venue_analytics_daily FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Campaign metrics sponsor read" ON public.sponsor_campaign_metrics_daily FOR SELECT
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.sponsor_campaigns c
      WHERE c.id = campaign_id AND public.is_sponsor_org_member(c.organization_id)
    )
  );
CREATE POLICY "Admin manages campaign metrics" ON public.sponsor_campaign_metrics_daily FOR ALL
  USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Ad impressions insert auth" ON public.advertisement_impressions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);
CREATE POLICY "Ad impressions read sponsor" ON public.advertisement_impressions FOR SELECT
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.advertisements a
      JOIN public.sponsor_campaigns c ON c.id = a.campaign_id
      WHERE a.id = advertisement_id AND public.is_sponsor_org_member(c.organization_id)
    )
  );

CREATE POLICY "Ad clicks insert auth" ON public.advertisement_clicks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Ad clicks read sponsor" ON public.advertisement_clicks FOR SELECT
  USING (
    public.is_admin_profile()
    OR EXISTS (
      SELECT 1 FROM public.advertisements a
      JOIN public.sponsor_campaigns c ON c.id = a.campaign_id
      WHERE a.id = advertisement_id AND public.is_sponsor_org_member(c.organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Seed reference data & flagship venues
-- ---------------------------------------------------------------------------

INSERT INTO public.venue_types (slug, name, icon_key, sort_order) VALUES
  ('arena', 'Arena', 'arena', 1),
  ('theater', 'Theater', 'theater', 2),
  ('comedy-club', 'Comedy Club', 'comedy', 3),
  ('music-hall', 'Music Hall', 'music-hall', 4),
  ('nightclub', 'Nightclub', 'nightclub', 5),
  ('podcast-studio', 'Podcast Studio', 'podcast', 6),
  ('lecture-hall', 'Lecture Hall', 'lecture', 7),
  ('gaming-arena', 'Gaming Arena', 'gaming', 8),
  ('convention-center', 'Convention Center', 'convention', 9),
  ('festival-grounds', 'Festival Grounds', 'festival', 10),
  ('outdoor-amphitheater', 'Outdoor Amphitheater', 'amphitheater', 11)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.billboard_location_types (slug, name, sort_order) VALUES
  ('homepage', 'Homepage Billboard', 1),
  ('concourse', 'Concourse Billboard', 2),
  ('loading', 'Loading Screen', 3),
  ('event-banner', 'Event Banner', 4),
  ('vip-lounge', 'VIP Lounge', 5),
  ('exit', 'Exit Screen', 6),
  ('sponsor-splash', 'Sponsor Splash Page', 7),
  ('interactive', 'Interactive Advertisement', 8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.venue_themes (slug, name, sort_order) VALUES
  ('summer-festival', 'Summer Festival', 1),
  ('halloween', 'Halloween', 2),
  ('winter-wonderland', 'Winter Wonderland', 3),
  ('holiday-concert', 'Holiday Concert Series', 4),
  ('pride-month', 'Pride Month', 5),
  ('comic-convention', 'Comic Convention', 6),
  ('anime-festival', 'Anime Festival', 7),
  ('country-weekend', 'Country Music Weekend', 8),
  ('jazz-festival', 'Jazz Festival', 9),
  ('electronic-month', 'Electronic Music Month', 10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.venues (slug, name, region, state_code, venue_type_id, capacity, description)
SELECT v.slug, v.name, v.region, v.state_code, vt.id, v.capacity, v.description
FROM (VALUES
  ('new-york-city-arena', 'New York City Arena', 'New York City', 'NY', 65000, 'Flagship northeast arena for simultaneous live circuits.'),
  ('buffalo-arena', 'Buffalo Arena', 'Buffalo', 'NY', 19000, 'Western New York virtual arena.'),
  ('albany-arena', 'Albany Arena', 'Albany', 'NY', 17500, 'Capital district performance venue.'),
  ('boston-arena', 'Boston Arena', 'Boston', 'MA', 19500, 'New England hub for tours and festivals.'),
  ('providence-arena', 'Providence Arena', 'Providence', 'RI', 14000, 'Rhode Island live entertainment venue.'),
  ('los-angeles-arena', 'Los Angeles Arena', 'Los Angeles', 'CA', 20000, 'West coast flagship arena.'),
  ('san-diego-arena', 'San Diego Arena', 'San Diego', 'CA', 18000, 'Southern California coastal venue.'),
  ('dallas-arena', 'Dallas Arena', 'Dallas', 'TX', 21000, 'Central US touring stop.'),
  ('miami-arena', 'Miami Arena', 'Miami', 'FL', 20000, 'Latin and electronic showcase venue.'),
  ('seattle-arena', 'Seattle Arena', 'Seattle', 'WA', 18100, 'Pacific northwest arena.'),
  ('las-vegas-arena', 'Las Vegas Arena', 'Las Vegas', 'NV', 20000, 'Residency and festival destination.'),
  ('london-arena', 'London Arena', 'London', NULL, 20000, 'United Kingdom flagship venue.'),
  ('paris-arena', 'Paris Arena', 'Paris', NULL, 15000, 'European music and culture hall.'),
  ('tokyo-arena', 'Tokyo Arena', 'Tokyo', NULL, 15000, 'Asia-Pacific virtual arena.'),
  ('sydney-arena', 'Sydney Arena', 'Sydney', NULL, 21000, 'Oceania touring centerpiece.')
) AS v(slug, name, region, state_code, capacity, description)
JOIN public.venue_types vt ON vt.slug = 'arena'
ON CONFLICT (slug) DO NOTHING;

-- Default concourse + homepage billboards per seeded venue
INSERT INTO public.venue_billboards (venue_id, location_type_id, slug, label, zone_key)
SELECT ven.id, blt.id, 'homepage-hero', 'Homepage Hero Billboard', 'homepage'
FROM public.venues ven
CROSS JOIN public.billboard_location_types blt
WHERE blt.slug = 'homepage'
ON CONFLICT (venue_id, slug) DO NOTHING;

INSERT INTO public.venue_billboards (venue_id, location_type_id, slug, label, zone_key)
SELECT ven.id, blt.id, 'concourse-main', 'Main Concourse Billboard', 'concourse'
FROM public.venues ven
CROSS JOIN public.billboard_location_types blt
WHERE blt.slug = 'concourse'
ON CONFLICT (venue_id, slug) DO NOTHING;

-- Founding sponsor badge placeholder (venue_badges template)
INSERT INTO public.venue_badges (venue_id, slug, name, description)
SELECT id, 'founding-sponsor-legacy', 'Founding Sponsor Legacy', 'Permanent recognition for the first naming sponsor of this venue.'
FROM public.venues
ON CONFLICT (venue_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 20250721000010_tour_stops_venue_assignment.sql
-- ---------------------------------------------------------------------------

-- Milestone 4: assign tour stops to virtual venues (syncs to events)

ALTER TABLE public.tour_stops
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

ALTER TABLE public.tour_stops
  ADD COLUMN IF NOT EXISTS venue_room_label TEXT;

CREATE INDEX IF NOT EXISTS idx_tour_stops_venue ON public.tour_stops(venue_id)
  WHERE venue_id IS NOT NULL;

COMMENT ON COLUMN public.tour_stops.venue_room_label IS
  'Logical room within a venue; copied to events.venue_room_label for simultaneous shows.';

-- ---------------------------------------------------------------------------
-- 20250721000011_concourse_defaults.sql
-- ---------------------------------------------------------------------------

-- Milestone 5: default digital concourse booths for flagship venues

INSERT INTO public.concourse_shops (venue_id, kind, name, slug, description, sort_order, zone)
SELECT v.id, x.kind, x.name, x.slug, x.description, x.sort_order, x.zone::jsonb
FROM public.venues v
CROSS JOIN (VALUES
  (
    'information_desk'::public.concourse_shop_kind,
    'Information Desk',
    'information-desk',
    'Maps, accessibility, and guest services.',
    0,
    '{"x":0,"y":0,"w":2,"h":1,"vrAnchor":"information-desk"}'
  ),
  (
    'event_board'::public.concourse_shop_kind,
    'Tonight''s Shows',
    'event-board',
    'Upcoming performances and live room assignments.',
    1,
    '{"x":2,"y":0,"w":2,"h":2,"vrAnchor":"event-board"}'
  ),
  (
    'venue_directory'::public.concourse_shop_kind,
    'Venue Directory',
    'venue-directory',
    'Explore other LiveCircuit venues by region.',
    2,
    '{"x":0,"y":1,"w":2,"h":1,"vrAnchor":"directory"}'
  ),
  (
    'photo_booth'::public.concourse_shop_kind,
    'Fan Photo Booth',
    'photo-booth',
    'Capture a memory before you head to your show.',
    3,
    '{"x":4,"y":0,"w":1,"h":1,"vrAnchor":"photo-booth"}'
  )
) AS x(kind, name, slug, description, sort_order, zone)
WHERE v.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.concourse_shops cs
    WHERE cs.venue_id = v.id AND cs.slug = x.slug
  );

-- ---------------------------------------------------------------------------
-- 20250721000012_global_homepage_sponsor.sql
-- ---------------------------------------------------------------------------

-- Milestone 6: global homepage sponsorship placement

INSERT INTO public.venue_billboards (venue_id, location_type_id, slug, label, zone_key)
SELECT NULL, blt.id, 'platform-homepage', 'LiveCircuit Homepage Hero', 'homepage'
FROM public.billboard_location_types blt
WHERE blt.slug = 'homepage'
  AND NOT EXISTS (
    SELECT 1 FROM public.venue_billboards vb
    WHERE vb.venue_id IS NULL AND vb.slug = 'platform-homepage'
  );

-- ---------------------------------------------------------------------------
-- 20250721000013_venue_loyalty_badges.sql
-- ---------------------------------------------------------------------------

-- Milestone 9: default venue loyalty badges (criteria evaluated in app)

INSERT INTO public.venue_badges (venue_id, slug, name, description, criteria)
SELECT
  v.id,
  b.slug,
  b.name,
  b.description,
  b.criteria
FROM public.venues v
CROSS JOIN (
  VALUES
    (
      'first-check-in',
      'First Check-in',
      'Visited the digital concourse for the first time.',
      '{"minCheckIns":1}'::jsonb
    ),
    (
      'concourse-regular',
      'Concourse Regular',
      'Checked in at this venue five times.',
      '{"minCheckIns":5}'::jsonb
    ),
    (
      'silver-member',
      'Silver Member',
      'Reached Silver loyalty tier.',
      '{"minLevel":"silver"}'::jsonb
    ),
    (
      'gold-member',
      'Gold Member',
      'Reached Gold loyalty tier.',
      '{"minLevel":"gold"}'::jsonb
    ),
    (
      'diamond-member',
      'Diamond Member',
      'Reached Diamond loyalty tier.',
      '{"minLevel":"diamond"}'::jsonb
    ),
    (
      'community-critic',
      'Community Critic',
      'Left a star review for this venue.',
      '{"hasReview":true}'::jsonb
    )
) AS b(slug, name, description, criteria)
ON CONFLICT (venue_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 20250721000014_venue_theme_assets.sql
-- ---------------------------------------------------------------------------

-- Milestone 10: seasonal theme palettes & assets

UPDATE public.venue_themes SET
  description = 'Sun-soaked stages, open-air energy, and festival lighting.',
  default_palette = '{"primary":"oklch(0.78 0.18 85)","accent":"oklch(0.72 0.2 45)","glow":"oklch(0.85 0.14 95)"}'::jsonb,
  assets = '{"icon":"☀️","heroGradient":"linear-gradient(180deg, oklch(0.55 0.16 85 / 45%), transparent)","meshTint":"oklch(0.72 0.18 85 / 30%)","panelBorder":"oklch(0.85 0.12 85 / 35%)"}'::jsonb
WHERE slug = 'summer-festival';

UPDATE public.venue_themes SET
  description = 'Spooky concourse decor and midnight purple highlights.',
  default_palette = '{"primary":"oklch(0.68 0.22 55)","accent":"oklch(0.55 0.2 300)","glow":"oklch(0.72 0.18 55)"}'::jsonb,
  assets = '{"icon":"🎃","heroGradient":"linear-gradient(180deg, oklch(0.45 0.18 55 / 55%), transparent)","meshTint":"oklch(0.5 0.2 55 / 25%)","panelBorder":"oklch(0.65 0.16 55 / 40%)"}'::jsonb
WHERE slug = 'halloween';

UPDATE public.venue_themes SET
  description = 'Frosted glass panels and aurora accents.',
  default_palette = '{"primary":"oklch(0.82 0.1 230)","accent":"oklch(0.75 0.14 200)","glow":"oklch(0.88 0.08 210)"}'::jsonb,
  assets = '{"icon":"❄️","heroGradient":"linear-gradient(180deg, oklch(0.55 0.12 230 / 50%), transparent)","meshTint":"oklch(0.65 0.1 230 / 28%)","panelBorder":"oklch(0.8 0.08 230 / 35%)"}'::jsonb
WHERE slug = 'winter-wonderland';

UPDATE public.venue_themes SET
  description = 'Classic holiday concert halls with warm gold trim.',
  default_palette = '{"primary":"oklch(0.72 0.16 145)","accent":"oklch(0.78 0.18 85)","glow":"oklch(0.8 0.12 145)"}'::jsonb,
  assets = '{"icon":"🎄","heroGradient":"linear-gradient(180deg, oklch(0.5 0.14 145 / 45%), transparent)","meshTint":"oklch(0.55 0.12 145 / 22%)","panelBorder":"oklch(0.7 0.1 145 / 38%)"}'::jsonb
WHERE slug = 'holiday-concert';

UPDATE public.venue_themes SET
  description = 'Rainbow-forward branding across venue surfaces.',
  default_palette = '{"primary":"oklch(0.7 0.22 330)","accent":"oklch(0.72 0.2 250)","glow":"oklch(0.78 0.18 300)"}'::jsonb,
  assets = '{"icon":"🏳️‍🌈","heroGradient":"linear-gradient(135deg, oklch(0.55 0.2 330 / 40%), oklch(0.55 0.18 250 / 35%), transparent)","meshTint":"oklch(0.6 0.18 300 / 25%)","panelBorder":"oklch(0.72 0.16 330 / 35%)"}'::jsonb
WHERE slug = 'pride-month';

UPDATE public.venue_themes SET
  description = 'Bold comic panels and convention floor energy.',
  default_palette = '{"primary":"oklch(0.72 0.22 25)","accent":"oklch(0.68 0.2 260)","glow":"oklch(0.78 0.18 25)"}'::jsonb,
  assets = '{"icon":"💥","heroGradient":"linear-gradient(180deg, oklch(0.5 0.2 25 / 50%), transparent)","meshTint":"oklch(0.55 0.18 25 / 22%)","panelBorder":"oklch(0.68 0.2 25 / 40%)"}'::jsonb
WHERE slug = 'comic-convention';

UPDATE public.venue_themes SET
  description = 'Neon sakura accents and anime-night promos.',
  default_palette = '{"primary":"oklch(0.72 0.2 350)","accent":"oklch(0.7 0.18 280)","glow":"oklch(0.8 0.14 350)"}'::jsonb,
  assets = '{"icon":"🌸","heroGradient":"linear-gradient(180deg, oklch(0.52 0.18 350 / 45%), transparent)","meshTint":"oklch(0.58 0.16 350 / 25%)","panelBorder":"oklch(0.72 0.14 350 / 38%)"}'::jsonb
WHERE slug = 'anime-festival';

UPDATE public.venue_themes SET
  description = 'Warm amber stages and rustic concourse signage.',
  default_palette = '{"primary":"oklch(0.7 0.16 65)","accent":"oklch(0.62 0.12 55)","glow":"oklch(0.78 0.12 70)"}'::jsonb,
  assets = '{"icon":"🤠","heroGradient":"linear-gradient(180deg, oklch(0.48 0.12 65 / 48%), transparent)","meshTint":"oklch(0.55 0.1 65 / 22%)","panelBorder":"oklch(0.65 0.1 65 / 35%)"}'::jsonb
WHERE slug = 'country-weekend';

UPDATE public.venue_themes SET
  description = 'Smoky lounge lighting and brass accents.',
  default_palette = '{"primary":"oklch(0.68 0.14 55)","accent":"oklch(0.72 0.12 85)","glow":"oklch(0.75 0.1 55)"}'::jsonb,
  assets = '{"icon":"🎷","heroGradient":"linear-gradient(180deg, oklch(0.42 0.1 55 / 55%), transparent)","meshTint":"oklch(0.5 0.08 55 / 25%)","panelBorder":"oklch(0.62 0.08 55 / 38%)"}'::jsonb
WHERE slug = 'jazz-festival';

UPDATE public.venue_themes SET
  description = 'Laser-grid aesthetics and bass-forward visuals.',
  default_palette = '{"primary":"oklch(0.72 0.22 280)","accent":"oklch(0.68 0.24 320)","glow":"oklch(0.78 0.2 280)"}'::jsonb,
  assets = '{"icon":"🎧","heroGradient":"linear-gradient(180deg, oklch(0.45 0.22 280 / 55%), transparent)","meshTint":"oklch(0.5 0.2 280 / 30%)","panelBorder":"oklch(0.65 0.2 280 / 42%)"}'::jsonb
WHERE slug = 'electronic-month';

-- Demo active assignments (one theme per flagship venue)
INSERT INTO public.venue_theme_assignments (venue_id, theme_id, is_active)
SELECT v.id, t.id, true
FROM public.venues v
JOIN public.venue_themes t ON t.slug = 'summer-festival'
WHERE v.slug = 'new-york-city-arena'
  AND NOT EXISTS (
    SELECT 1 FROM public.venue_theme_assignments a
    WHERE a.venue_id = v.id AND a.is_active = true AND a.ends_at IS NULL
  );

INSERT INTO public.venue_theme_assignments (venue_id, theme_id, is_active)
SELECT v.id, t.id, true
FROM public.venues v
JOIN public.venue_themes t ON t.slug = 'halloween'
WHERE v.slug = 'buffalo-arena'
  AND NOT EXISTS (
    SELECT 1 FROM public.venue_theme_assignments a
    WHERE a.venue_id = v.id AND a.is_active = true AND a.ends_at IS NULL
  );

INSERT INTO public.venue_theme_assignments (venue_id, theme_id, is_active)
SELECT v.id, t.id, true
FROM public.venues v
JOIN public.venue_themes t ON t.slug = 'winter-wonderland'
WHERE v.slug = 'boston-arena'
  AND NOT EXISTS (
    SELECT 1 FROM public.venue_theme_assignments a
    WHERE a.venue_id = v.id AND a.is_active = true AND a.ends_at IS NULL
  );

-- ---------------------------------------------------------------------------
-- 20250721000015_performance_impressions.sql
-- ---------------------------------------------------------------------------

-- Milestone 11: impression scale indexes, rollup RPC, partition guidance

CREATE INDEX IF NOT EXISTS idx_ad_impressions_created_brin
  ON public.advertisement_impressions USING brin (created_at);

CREATE INDEX IF NOT EXISTS idx_ad_clicks_created_brin
  ON public.advertisement_clicks USING brin (created_at);

COMMENT ON TABLE public.advertisement_impressions IS
  'High-volume telemetry. BRIN(created_at) supports time-range scans. When rows exceed ~10M, migrate to RANGE (created_at) monthly partitions and attach future months via CREATE TABLE ... PARTITION OF.';

-- Daily sponsor metrics rollup (service role / cron)
CREATE OR REPLACE FUNCTION public.rollup_sponsor_campaign_metrics_daily(p_bucket date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  INSERT INTO public.sponsor_campaign_metrics_daily (
    campaign_id,
    bucket_date,
    impressions,
    clicks,
    unique_visitors
  )
  SELECT
    sc.id,
    p_bucket,
    COALESCE(imp.impressions, 0),
    COALESCE(clk.clicks, 0),
    COALESCE(imp.unique_visitors, 0)
  FROM public.sponsor_campaigns sc
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::bigint AS impressions,
      COUNT(DISTINCT COALESCE(i.user_id::text, i.session_id, i.id::text))::integer AS unique_visitors
    FROM public.advertisements a
    JOIN public.advertisement_impressions i ON i.advertisement_id = a.id
    WHERE a.campaign_id = sc.id
      AND (i.created_at AT TIME ZONE 'UTC')::date = p_bucket
  ) imp ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS clicks
    FROM public.advertisements a
    JOIN public.advertisement_clicks c ON c.advertisement_id = a.id
    WHERE a.campaign_id = sc.id
      AND (c.created_at AT TIME ZONE 'UTC')::date = p_bucket
  ) clk ON true
  WHERE COALESCE(imp.impressions, 0) > 0 OR COALESCE(clk.clicks, 0) > 0
  ON CONFLICT (campaign_id, bucket_date) DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    unique_visitors = EXCLUDED.unique_visitors,
    updated_at = now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.rollup_sponsor_campaign_metrics_daily(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollup_sponsor_campaign_metrics_daily(date) TO service_role;

-- ---------------------------------------------------------------------------
-- 20250722000001_ai_tour_planner.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M1: AI Tour Planner run history

CREATE TABLE public.artist_tour_planner_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tour_planner_runs_artist ON public.artist_tour_planner_runs(artist_id, created_at DESC);

ALTER TABLE public.artist_tour_planner_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists read own tour planner runs" ON public.artist_tour_planner_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists insert own tour planner runs" ON public.artist_tour_planner_runs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin reads tour planner runs" ON public.artist_tour_planner_runs
  FOR SELECT USING (public.is_admin_profile());

-- ---------------------------------------------------------------------------
-- 20250722000002_artist_momentum.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M2: Artist Momentum (LiveCircuit Score) daily snapshots

CREATE TABLE public.artist_momentum_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
  trend TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  bucket_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, bucket_date)
);

CREATE INDEX idx_artist_momentum_artist_date
  ON public.artist_momentum_snapshots(artist_id, bucket_date DESC);

ALTER TABLE public.artist_momentum_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read artist momentum" ON public.artist_momentum_snapshots
  FOR SELECT USING (true);

CREATE POLICY "Artists insert own momentum" ON public.artist_momentum_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists update own momentum" ON public.artist_momentum_snapshots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id = artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin manages artist momentum" ON public.artist_momentum_snapshots
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- ---------------------------------------------------------------------------
-- 20250722000003_fan_passport.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M3: Fan Passport (stamps + achievements)

CREATE TABLE public.fan_passports (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  passport_number TEXT NOT NULL UNIQUE,
  stamp_count INTEGER NOT NULL DEFAULT 0 CHECK (stamp_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fan_passport_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  venue_name TEXT,
  city_name TEXT,
  state_code TEXT,
  country_code TEXT,
  country_name TEXT,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  artist_name TEXT,
  artist_category TEXT,
  event_title TEXT NOT NULL,
  attended_at TIMESTAMPTZ NOT NULL,
  is_vip BOOLEAN NOT NULL DEFAULT false,
  is_special BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id),
  UNIQUE (ticket_id)
);

CREATE INDEX idx_fan_passport_stamps_user ON public.fan_passport_stamps(user_id, attended_at DESC);
CREATE INDEX idx_fan_passport_stamps_country ON public.fan_passport_stamps(user_id, country_code);

CREATE TABLE public.fan_passport_achievement_defs (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  metric TEXT NOT NULL,
  target_value INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.fan_passport_user_achievements (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_slug TEXT NOT NULL REFERENCES public.fan_passport_achievement_defs(slug) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_slug)
);

INSERT INTO public.fan_passport_achievement_defs (slug, name, description, metric, target_value, sort_order) VALUES
  ('first_concert', 'First Concert', 'Attend your first live show.', 'stamp_count', 1, 1),
  ('concerts_100', '100 Concerts', 'Collect 100 event stamps.', 'stamp_count', 100, 2),
  ('comedy_50', '50 Comedy Shows', 'Stamp 50 comedy performances.', 'comedy_stamps', 50, 3),
  ('vip_collector', 'VIP Collector', 'Attend 10 VIP shows.', 'vip_stamps', 10, 4),
  ('festival_legend', 'Festival Legend', 'Join 5 special or festival events.', 'special_stamps', 5, 5),
  ('all_us_states', 'Visited Every State', 'Stamp shows in every U.S. state.', 'distinct_us_states', 50, 6),
  ('all_countries', 'Visited Every Country', 'Stamp shows in every country on LiveCircuit.', 'distinct_countries', 1, 7),
  ('founding_fan', 'Founding Fan', 'Support an artist as one of their first 100 fans.', 'founding_fan', 1, 8)
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.refresh_fan_passport_stamp_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.fan_passports
    SET stamp_count = stamp_count + 1, updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.fan_passports
    SET stamp_count = GREATEST(0, stamp_count - 1), updated_at = now()
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER fan_passport_stamps_count_ins
  AFTER INSERT ON public.fan_passport_stamps
  FOR EACH ROW EXECUTE FUNCTION public.refresh_fan_passport_stamp_count();

CREATE TRIGGER fan_passport_stamps_count_del
  AFTER DELETE ON public.fan_passport_stamps
  FOR EACH ROW EXECUTE FUNCTION public.refresh_fan_passport_stamp_count();

ALTER TABLE public.fan_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_passport_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_passport_achievement_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_passport_user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own passport" ON public.fan_passports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own passport" ON public.fan_passports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own passport" ON public.fan_passports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public read passport numbers" ON public.fan_passports
  FOR SELECT USING (true);

CREATE POLICY "Users read own stamps" ON public.fan_passport_stamps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own stamps" ON public.fan_passport_stamps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read stamps" ON public.fan_passport_stamps
  FOR SELECT USING (true);

CREATE POLICY "Achievement defs public read" ON public.fan_passport_achievement_defs
  FOR SELECT USING (true);

CREATE POLICY "Users read own achievements" ON public.fan_passport_user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users earn achievements" ON public.fan_passport_user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read achievements" ON public.fan_passport_user_achievements
  FOR SELECT USING (true);

CREATE POLICY "Admin fan passport" ON public.fan_passports
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Admin fan passport stamps" ON public.fan_passport_stamps
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Admin fan passport achievements" ON public.fan_passport_user_achievements
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- ---------------------------------------------------------------------------
-- 20250722000004_seasons.sql
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 20250722000005_virtual_festivals.sql
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 20250722000006_backstage_pass.sql
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 20250722000007_venue_collections.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M7: Fan Venue Collections

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hall_of_fame BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE public.user_venue_visits (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  visit_count INTEGER NOT NULL DEFAULT 1 CHECK (visit_count >= 1),
  first_visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, venue_id)
);

CREATE INDEX idx_user_venue_visits_user ON public.user_venue_visits(user_id, last_visited_at DESC);

-- Mark sample flagship venues for collection UX
UPDATE public.venues SET is_hall_of_fame = true
WHERE slug IN ('new-york-city-arena', 'los-angeles-arena', 'las-vegas-arena');

UPDATE public.venues SET is_seasonal = true
WHERE slug IN ('boston-arena', 'san-diego-arena');

UPDATE public.venues SET is_hidden = true
WHERE slug IN ('providence-arena', 'albany-arena');

ALTER TABLE public.user_venue_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own venue visits" ON public.user_venue_visits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own venue visits" ON public.user_venue_visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own venue visits" ON public.user_venue_visits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin venue visits" ON public.user_venue_visits
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- ---------------------------------------------------------------------------
-- 20250722000008_friends_system.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M8: Friends System (graph, presence, activity, friend DM, watch parties)

CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');

CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id, status);
CREATE INDEX idx_friendships_requester ON public.friendships(requester_id, status);

CREATE TABLE public.user_follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE TABLE public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.friend_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verb TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_friend_activity_actor ON public.friend_activity_events(actor_id, created_at DESC);

CREATE TABLE public.friend_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_high UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_low < user_high),
  UNIQUE (user_low, user_high)
);

CREATE TABLE public.friend_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.friend_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_friend_messages_conv ON public.friend_messages(conversation_id, created_at DESC);

CREATE TABLE public.watch_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  invite_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'live', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.watch_party_members (
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (party_id, user_id)
);

CREATE TABLE public.watch_party_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_watch_party_messages ON public.watch_party_messages(party_id, created_at DESC);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Friendships read involved" ON public.friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Friendships request" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Friendships respond" ON public.friendships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "User follows public read" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "User follows manage own" ON public.user_follows
  FOR ALL USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Presence public read" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "Presence upsert own" ON public.user_presence
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Activity public read" ON public.friend_activity_events FOR SELECT USING (true);
CREATE POLICY "Activity insert own" ON public.friend_activity_events
  FOR INSERT WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "Friend conv read participants" ON public.friend_conversations
  FOR SELECT USING (auth.uid() = user_low OR auth.uid() = user_high);
CREATE POLICY "Friend conv insert participant" ON public.friend_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_low OR auth.uid() = user_high);

CREATE POLICY "Friend messages read" ON public.friend_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.friend_conversations c
      WHERE c.id = conversation_id AND (c.user_low = auth.uid() OR c.user_high = auth.uid())
    )
  );
CREATE POLICY "Friend messages insert" ON public.friend_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.friend_conversations c
      WHERE c.id = conversation_id AND (c.user_low = auth.uid() OR c.user_high = auth.uid())
    )
  );

CREATE POLICY "Watch parties read" ON public.watch_parties FOR SELECT USING (true);
CREATE POLICY "Watch parties host insert" ON public.watch_parties
  FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Watch party members read" ON public.watch_party_members FOR SELECT USING (true);
CREATE POLICY "Watch party members join" ON public.watch_party_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Watch party chat read" ON public.watch_party_messages FOR SELECT USING (true);
CREATE POLICY "Watch party chat insert" ON public.watch_party_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.watch_party_members m
      WHERE m.party_id = watch_party_messages.party_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin friends" ON public.friendships
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- ---------------------------------------------------------------------------
-- 20250722000009_livecircuit_coins.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M9: LiveCircuit Coins (wallet, ledger, shop, cosmetics)

CREATE TABLE public.coin_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  category TEXT NOT NULL,
  source_key TEXT,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_key)
);

CREATE INDEX idx_coin_transactions_user ON public.coin_transactions(user_id, created_at DESC);

CREATE TABLE public.coin_shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (
    category IN (
      'avatar',
      'theme',
      'animation',
      'badge',
      'profile',
      'venue_collectible',
      'digital_merch',
      'reaction'
    )
  ),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_coins INTEGER NOT NULL CHECK (price_coins > 0),
  image_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_coin_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.coin_shop_items(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

CREATE TABLE public.user_coin_equipment (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot TEXT NOT NULL CHECK (slot IN ('avatar', 'theme', 'animation', 'badge', 'profile', 'reaction')),
  item_id UUID NOT NULL REFERENCES public.coin_shop_items(id) ON DELETE CASCADE,
  equipped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

CREATE TABLE public.coin_daily_claims (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, claim_date)
);

CREATE TABLE public.coin_referral_codes (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.coin_referral_redemptions (
  referred_user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.coin_shop_items (slug, category, name, description, price_coins, sort_order, metadata) VALUES
  ('avatar-neon-ring', 'avatar', 'Neon ring', 'Pulsing ring around your avatar.', 250, 10, '{"slot":"avatar"}'::jsonb),
  ('avatar-gold-crown', 'avatar', 'Gold crown', 'Show VIP energy in every room.', 600, 11, '{"slot":"avatar"}'::jsonb),
  ('theme-midnight', 'theme', 'Midnight theme', 'Deep purple interface accent for your profile.', 400, 20, '{"slot":"theme"}'::jsonb),
  ('theme-aurora', 'theme', 'Aurora theme', 'Northern-lights gradient profile styling.', 550, 21, '{"slot":"theme"}'::jsonb),
  ('anim-confetti', 'animation', 'Confetti burst', 'Celebrate drops and encores.', 350, 30, '{"slot":"animation"}'::jsonb),
  ('badge-coin-collector', 'badge', 'Coin collector', 'Badge for early economy adopters.', 200, 40, '{"slot":"badge"}'::jsonb),
  ('profile-gradient-banner', 'profile', 'Gradient banner', 'Wide hero banner on your public fan card.', 450, 50, '{"slot":"profile"}'::jsonb),
  ('venue-holo-ticket', 'venue_collectible', 'Holographic ticket stub', 'Digital venue collectible for your shelf.', 500, 60, '{}'::jsonb),
  ('merch-sticker-pack', 'digital_merch', 'Artist sticker pack', 'Animated stickers for chat and DMs.', 300, 70, '{}'::jsonb),
  ('reaction-sparkle-pack', 'reaction', 'Sparkle reactions', 'Unlock ✨ and 💫 exclusive live reactions.', 275, 80, '{"slot":"reaction"}'::jsonb);

ALTER TABLE public.coin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coin_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coin_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_referral_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coin wallet read own" ON public.coin_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coin tx read own" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coin shop public read" ON public.coin_shop_items FOR SELECT USING (is_active = true);
CREATE POLICY "Coin inventory read own" ON public.user_coin_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coin equipment read own" ON public.user_coin_equipment FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coin equipment read public" ON public.user_coin_equipment FOR SELECT USING (true);
CREATE POLICY "Coin daily read own" ON public.coin_daily_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Referral code read own" ON public.coin_referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Referral code read by code" ON public.coin_referral_codes FOR SELECT USING (true);
CREATE POLICY "Referral redemption read involved" ON public.coin_referral_redemptions
  FOR SELECT USING (auth.uid() = referred_user_id OR auth.uid() = referrer_id);

CREATE POLICY "Admin coin wallets" ON public.coin_wallets
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());
CREATE POLICY "Admin coin tx" ON public.coin_transactions
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- ---------------------------------------------------------------------------
-- 20250722000010_creator_marketplace.sql
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 20250722000011_local_business_marketplace.sql
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 20250722000012_venue_tv_network.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M12: Venue TV Network (per-venue channel, programs, auto playlists)

CREATE TYPE public.venue_tv_program_type AS ENUM (
  'upcoming_show',
  'trailer',
  'interview',
  'highlight',
  'music_video',
  'comedy_clip',
  'festival_announcement',
  'sponsor_commercial',
  'behind_scenes',
  'venue_news'
);

CREATE TABLE public.venue_tv_channels (
  venue_id UUID PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT 'Your venue channel on LiveCircuit',
  is_on_air BOOLEAN NOT NULL DEFAULT true,
  active_playlist_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.venue_tv_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  program_type public.venue_tv_program_type NOT NULL,
  source_key TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  thumbnail_url TEXT,
  link_href TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 180,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, source_key)
);

CREATE INDEX idx_venue_tv_programs_venue ON public.venue_tv_programs(venue_id, program_type);

CREATE TABLE public.venue_tv_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_auto_generated BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_tv_playlists_venue ON public.venue_tv_playlists(venue_id, is_active);

CREATE TABLE public.venue_tv_playlist_items (
  playlist_id UUID NOT NULL REFERENCES public.venue_tv_playlists(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.venue_tv_programs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (playlist_id, position),
  UNIQUE (playlist_id, program_id)
);

ALTER TABLE public.venue_tv_channels
  ADD CONSTRAINT venue_tv_channels_playlist_fkey
  FOREIGN KEY (active_playlist_id) REFERENCES public.venue_tv_playlists(id) ON DELETE SET NULL;

CREATE TABLE public.venue_tv_program_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.venue_tv_programs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_tv_views_program ON public.venue_tv_program_views(program_id, created_at DESC);

ALTER TABLE public.venue_tv_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_tv_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_tv_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_tv_playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_tv_program_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue TV channel public read" ON public.venue_tv_channels FOR SELECT USING (true);
CREATE POLICY "Venue TV programs public read" ON public.venue_tv_programs
  FOR SELECT USING (is_published = true OR public.is_admin_profile());
CREATE POLICY "Venue TV playlists public read" ON public.venue_tv_playlists FOR SELECT USING (true);
CREATE POLICY "Venue TV playlist items public read" ON public.venue_tv_playlist_items FOR SELECT USING (true);
CREATE POLICY "Venue TV views insert" ON public.venue_tv_program_views
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Venue TV views read admin" ON public.venue_tv_program_views
  FOR SELECT USING (public.is_admin_profile());

CREATE POLICY "Admin venue TV" ON public.venue_tv_channels
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- ---------------------------------------------------------------------------
-- 20250722000013_venue_hall_of_fame.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M13: Venue Hall of Fame (per-venue legend categories)

CREATE TYPE public.venue_hof_category AS ENUM (
  'top_attendance',
  'top_revenue',
  'most_viewed',
  'highest_rated',
  'most_tips',
  'most_merchandise',
  'longest_running_show',
  'fan_favorite',
  'most_loyal_fans'
);

CREATE TYPE public.venue_hof_holder_type AS ENUM ('artist', 'event', 'fan');

CREATE TABLE public.venue_hall_of_fame_entries (
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  category public.venue_hof_category NOT NULL,
  rank INTEGER NOT NULL DEFAULT 1 CHECK (rank >= 1 AND rank <= 3),
  holder_type public.venue_hof_holder_type NOT NULL,
  holder_id UUID,
  display_name TEXT NOT NULL,
  subtitle TEXT,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  metric_label TEXT NOT NULL,
  link_href TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, category, rank)
);

CREATE INDEX idx_venue_hof_venue ON public.venue_hall_of_fame_entries(venue_id, category);

ALTER TABLE public.venue_hall_of_fame_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue HOF public read" ON public.venue_hall_of_fame_entries FOR SELECT USING (true);
CREATE POLICY "Admin venue HOF" ON public.venue_hall_of_fame_entries
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- ---------------------------------------------------------------------------
-- 20250722000014_digital_walk_of_fame.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M14: Digital Walk of Fame (permanent artist stars)

CREATE TYPE public.walk_of_fame_criterion AS ENUM (
  'attendance',
  'revenue',
  'years_active',
  'community_impact',
  'fan_votes',
  'awards',
  'venue_contributions'
);

CREATE TABLE public.artist_walk_of_fame_stars (
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  criterion public.walk_of_fame_criterion NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metric_value NUMERIC NOT NULL DEFAULT 0,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (artist_id, criterion)
);

CREATE INDEX idx_wof_stars_artist ON public.artist_walk_of_fame_stars(artist_id);
CREATE INDEX idx_wof_stars_criterion ON public.artist_walk_of_fame_stars(criterion);

CREATE TABLE public.artist_walk_of_fame_votes (
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (artist_id, voter_id)
);

CREATE INDEX idx_wof_votes_artist ON public.artist_walk_of_fame_votes(artist_id);

ALTER TABLE public.artist_walk_of_fame_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_walk_of_fame_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Walk of Fame stars public read" ON public.artist_walk_of_fame_stars FOR SELECT USING (true);
CREATE POLICY "Admin walk of fame stars" ON public.artist_walk_of_fame_stars
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Walk of Fame votes public read" ON public.artist_walk_of_fame_votes FOR SELECT USING (true);
CREATE POLICY "Walk of Fame vote insert" ON public.artist_walk_of_fame_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- ---------------------------------------------------------------------------
-- 20250722000015_livecircuit_awards.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M15: LiveCircuit Awards (annual ceremony, nominees, fan voting, archive)

CREATE TYPE public.award_ceremony_status AS ENUM ('nomination', 'voting', 'live', 'archived');

CREATE TYPE public.award_category AS ENUM (
  'artist_of_the_year',
  'concert_of_the_year',
  'comedian_of_the_year',
  'dj_of_the_year',
  'podcast_of_the_year',
  'venue_of_the_year',
  'best_new_artist',
  'fan_favorite',
  'best_community',
  'highest_rated_event'
);

CREATE TYPE public.award_nominee_type AS ENUM ('artist', 'event', 'venue');

CREATE TABLE public.livecircuit_award_ceremonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  status public.award_ceremony_status NOT NULL DEFAULT 'nomination',
  tagline TEXT,
  voting_ends_at TIMESTAMPTZ NOT NULL,
  ceremony_at TIMESTAMPTZ NOT NULL,
  live_stream_url TEXT,
  archive_summary TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_award_ceremonies_status ON public.livecircuit_award_ceremonies(status, year DESC);

CREATE TABLE public.livecircuit_award_nominees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ceremony_id UUID NOT NULL REFERENCES public.livecircuit_award_ceremonies(id) ON DELETE CASCADE,
  category public.award_category NOT NULL,
  nominee_type public.award_nominee_type NOT NULL,
  ref_id UUID,
  display_name TEXT NOT NULL,
  subtitle TEXT,
  blurb TEXT,
  image_url TEXT,
  link_href TEXT,
  score NUMERIC NOT NULL DEFAULT 0,
  vote_count INTEGER NOT NULL DEFAULT 0,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  announced_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ceremony_id, category, nominee_type, ref_id)
);

CREATE INDEX idx_award_nominees_ceremony ON public.livecircuit_award_nominees(ceremony_id, category, sort_order);

CREATE TABLE public.livecircuit_award_votes (
  ceremony_id UUID NOT NULL REFERENCES public.livecircuit_award_ceremonies(id) ON DELETE CASCADE,
  category public.award_category NOT NULL,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nominee_id UUID NOT NULL REFERENCES public.livecircuit_award_nominees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ceremony_id, category, voter_id)
);

CREATE INDEX idx_award_votes_nominee ON public.livecircuit_award_votes(nominee_id);

ALTER TABLE public.livecircuit_award_ceremonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livecircuit_award_nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livecircuit_award_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Award ceremonies public read" ON public.livecircuit_award_ceremonies FOR SELECT USING (true);
CREATE POLICY "Admin award ceremonies" ON public.livecircuit_award_ceremonies
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Award nominees public read" ON public.livecircuit_award_nominees FOR SELECT USING (true);
CREATE POLICY "Admin award nominees" ON public.livecircuit_award_nominees
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Award votes public read" ON public.livecircuit_award_votes FOR SELECT USING (true);
CREATE POLICY "Award vote insert" ON public.livecircuit_award_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);

INSERT INTO public.livecircuit_award_ceremonies (
  slug, title, year, status, tagline, voting_ends_at, ceremony_at, live_stream_url, sort_order
)
VALUES
  (
    '2025',
    'LiveCircuit Awards 2025',
    2025,
    'archived',
    'The inaugural circuit honors.',
    '2025-12-01T00:00:00Z',
    '2025-12-15T20:00:00Z',
    NULL,
    1
  ),
  (
    '2026',
    'LiveCircuit Awards 2026',
    2026,
    'voting',
    'Fan votes decide the stars of the year.',
    '2026-12-01T23:59:59Z',
    '2026-12-15T20:00:00Z',
    'https://livecircuit.example/awards-live',
    2
  );

-- ---------------------------------------------------------------------------
-- 20250722000016_livecircuit_world.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M16: LiveCircuit World (trending regions cache for globe)

CREATE TABLE public.livecircuit_world_trending_regions (
  region_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  country_code TEXT,
  state_code TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  venue_count INTEGER NOT NULL DEFAULT 0,
  live_event_count INTEGER NOT NULL DEFAULT 0,
  attendance_score NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_world_trending_score ON public.livecircuit_world_trending_regions(attendance_score DESC);

CREATE INDEX IF NOT EXISTS idx_cities_lat_lng ON public.cities(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

ALTER TABLE public.livecircuit_world_trending_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "World trending public read" ON public.livecircuit_world_trending_regions FOR SELECT USING (true);
CREATE POLICY "Admin world trending" ON public.livecircuit_world_trending_regions
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- ---------------------------------------------------------------------------
-- 20250722000017_achievements_expansion.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M17: LiveCircuit Achievements (catalog + user progress)

CREATE TYPE public.livecircuit_achievement_category AS ENUM (
  'attendance',
  'vip',
  'friends',
  'reviews',
  'tips',
  'merch',
  'festivals',
  'venues',
  'countries',
  'genres',
  'seasons',
  'marketplace',
  'sponsors',
  'passport',
  'coins'
);

CREATE TABLE public.livecircuit_achievement_defs (
  slug TEXT PRIMARY KEY,
  category public.livecircuit_achievement_category NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  metric TEXT NOT NULL,
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  tier INTEGER NOT NULL DEFAULT 1 CHECK (tier >= 1 AND tier <= 3),
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lc_achievement_defs_category ON public.livecircuit_achievement_defs(category, sort_order);

CREATE TABLE public.livecircuit_user_achievement_progress (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_slug TEXT NOT NULL REFERENCES public.livecircuit_achievement_defs(slug) ON DELETE CASCADE,
  current_value NUMERIC NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  earned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_slug)
);

CREATE INDEX idx_lc_user_achievements_earned ON public.livecircuit_user_achievement_progress(user_id, earned_at DESC);

ALTER TABLE public.livecircuit_achievement_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livecircuit_user_achievement_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LC achievement defs public read" ON public.livecircuit_achievement_defs FOR SELECT USING (true);
CREATE POLICY "Admin LC achievement defs" ON public.livecircuit_achievement_defs
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Users read own LC achievement progress" ON public.livecircuit_user_achievement_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public read earned LC achievements" ON public.livecircuit_user_achievement_progress
  FOR SELECT USING (earned_at IS NOT NULL);
CREATE POLICY "Admin LC achievement progress" ON public.livecircuit_user_achievement_progress
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

-- Catalog seed (expandable toward hundreds)
INSERT INTO public.livecircuit_achievement_defs (slug, category, name, description, icon, metric, target_value, tier, sort_order) VALUES
  ('attendance_first_show', 'attendance', 'First Show', 'Attend your first ticketed event.', '🎫', 'ticket_count', 1, 1, 1),
  ('attendance_5', 'attendance', 'Regular', 'Attend 5 live events.', '🎟️', 'ticket_count', 5, 1, 2),
  ('attendance_10', 'attendance', 'Superfan', 'Attend 10 live events.', '🔥', 'ticket_count', 10, 1, 3),
  ('attendance_25', 'attendance', 'Road Warrior', 'Attend 25 live events.', '🚌', 'ticket_count', 25, 2, 4),
  ('attendance_50', 'attendance', 'Circuit Regular', 'Attend 50 live events.', '⚡', 'ticket_count', 50, 2, 5),
  ('attendance_100', 'attendance', 'Century Club', 'Attend 100 live events.', '💯', 'ticket_count', 100, 3, 6),
  ('attendance_200', 'attendance', 'Legend', 'Attend 200 live events.', '👑', 'ticket_count', 200, 3, 7),
  ('vip_first', 'vip', 'VIP Debut', 'Experience your first VIP show.', '✨', 'vip_ticket_count', 1, 1, 1),
  ('vip_5', 'vip', 'VIP Regular', 'Attend 5 VIP experiences.', '🌟', 'vip_ticket_count', 5, 1, 2),
  ('vip_10', 'vip', 'VIP Collector', 'Attend 10 VIP shows.', '💎', 'vip_ticket_count', 10, 2, 3),
  ('vip_25', 'vip', 'Backstage Elite', 'Attend 25 VIP shows.', '🎭', 'vip_ticket_count', 25, 3, 4),
  ('friends_first', 'friends', 'Say Hello', 'Connect with your first friend.', '👋', 'friend_count', 1, 1, 1),
  ('friends_5', 'friends', 'Squad Up', 'Make 5 friends on LiveCircuit.', '👥', 'friend_count', 5, 1, 2),
  ('friends_10', 'friends', 'Social Butterfly', 'Make 10 friends.', '🦋', 'friend_count', 10, 2, 3),
  ('friends_25', 'friends', 'Community Builder', 'Make 25 friends.', '🏘️', 'friend_count', 25, 3, 4),
  ('reviews_first', 'reviews', 'First Review', 'Leave your first event review.', '📝', 'review_count', 1, 1, 1),
  ('reviews_5', 'reviews', 'Critic', 'Leave 5 reviews.', '📋', 'review_count', 5, 1, 2),
  ('reviews_25', 'reviews', 'Voice of the Crowd', 'Leave 25 reviews.', '📣', 'review_count', 25, 2, 3),
  ('reviews_50', 'reviews', 'Resident Reviewer', 'Leave 50 reviews.', '🏆', 'review_count', 50, 3, 4),
  ('tips_first', 'tips', 'First Tip', 'Send your first tip to an artist.', '💵', 'tip_count', 1, 1, 1),
  ('tips_10', 'tips', 'Generous Fan', 'Send 10 tips.', '💸', 'tip_count', 10, 1, 2),
  ('tips_50', 'tips', 'Patron', 'Send 50 tips.', '🎁', 'tip_count', 50, 2, 3),
  ('tips_1000_cents', 'tips', 'Big Spender', 'Tip $10+ total across shows.', '💰', 'tip_total_cents', 1000, 2, 4),
  ('tips_10000_cents', 'tips', 'Sugar Daddy Energy', 'Tip $100+ total.', '🤑', 'tip_total_cents', 10000, 3, 5),
  ('merch_first', 'merch', 'First Merch', 'Complete your first merch order.', '👕', 'merch_order_count', 1, 1, 1),
  ('merch_5', 'merch', 'Merch Head', 'Complete 5 merch orders.', '🛍️', 'merch_order_count', 5, 1, 2),
  ('merch_20', 'merch', 'Tour Closet', 'Complete 20 merch orders.', '🧥', 'merch_order_count', 20, 3, 3),
  ('festivals_first', 'festivals', 'Festival Debut', 'Purchase your first festival pass.', '🎪', 'festival_pass_count', 1, 1, 1),
  ('festivals_3', 'festivals', 'Festival Hopper', 'Join 3 festivals.', '🎡', 'festival_pass_count', 3, 2, 2),
  ('festivals_5', 'festivals', 'Festival Legend', 'Join 5 festivals.', '🎆', 'festival_pass_count', 5, 3, 3),
  ('venues_3', 'venues', 'Venue Explorer', 'Visit 3 different venues.', '🏟️', 'distinct_venues', 3, 1, 1),
  ('venues_10', 'venues', 'Venue Tourist', 'Visit 10 venues.', '🗺️', 'distinct_venues', 10, 1, 2),
  ('venues_25', 'venues', 'Venue Collector', 'Visit 25 venues.', '📍', 'distinct_venues', 25, 2, 3),
  ('venues_50', 'venues', 'Hall Crawler', 'Visit 50 venues.', '🏛️', 'distinct_venues', 50, 3, 4),
  ('countries_3', 'countries', 'Globetrotter', 'Attend shows in 3 countries.', '🌍', 'distinct_countries', 3, 1, 1),
  ('countries_10', 'countries', 'World Passport', 'Attend shows in 10 countries.', '🌎', 'distinct_countries', 10, 2, 2),
  ('countries_25', 'countries', 'UN of Fans', 'Attend shows in 25 countries.', '🌏', 'distinct_countries', 25, 3, 3),
  ('genres_3', 'genres', 'Genre Curious', 'Experience 3 artist genres.', '🎵', 'distinct_genres', 3, 1, 1),
  ('genres_5', 'genres', 'Eclectic Ear', 'Experience 5 genres.', '🎶', 'distinct_genres', 5, 1, 2),
  ('genres_10', 'genres', 'Omnivore', 'Experience 10 genres.', '🎧', 'distinct_genres', 10, 2, 3),
  ('seasons_100', 'seasons', 'Season Starter', 'Earn 100 season points in a season.', '🍂', 'season_points_max', 100, 1, 1),
  ('seasons_500', 'seasons', 'Season Grinder', 'Earn 500 season points in a season.', '❄️', 'season_points_max', 500, 2, 2),
  ('seasons_1000', 'seasons', 'Season Champion', 'Earn 1,000 season points in a season.', '☀️', 'season_points_max', 1000, 3, 3),
  ('marketplace_first_booking', 'marketplace', 'First Hire', 'Book a creator from the marketplace.', '🤝', 'marketplace_bookings', 1, 1, 1),
  ('marketplace_5_bookings', 'marketplace', 'Production Pro', 'Complete 5 marketplace bookings.', '🎬', 'marketplace_bookings', 5, 2, 2),
  ('sponsors_first_checkin', 'sponsors', 'Concourse Hello', 'Check in at a venue concourse.', '🏷️', 'venue_check_ins', 1, 1, 1),
  ('sponsors_10_checkins', 'sponsors', 'Concourse Regular', '10 venue check-ins.', '🎟️', 'venue_check_ins', 10, 2, 2),
  ('sponsors_25_checkins', 'sponsors', 'Venue Local', '25 venue check-ins.', '🏙️', 'venue_check_ins', 25, 3, 3),
  ('passport_3', 'passport', 'Stamp Collector', 'Earn 3 passport achievements.', '📘', 'passport_achievements', 3, 1, 1),
  ('passport_all_core', 'passport', 'Passport Master', 'Earn 6 passport achievements.', '🛂', 'passport_achievements', 6, 3, 2),
  ('coins_100', 'coins', 'Coin Saver', 'Earn 100 LiveCircuit Coins total.', '🪙', 'coin_earned_total', 100, 1, 1),
  ('coins_500', 'coins', 'Coin Vault', 'Earn 500 coins total.', '💰', 'coin_earned_total', 500, 2, 2),
  ('coins_2000', 'coins', 'Treasury', 'Earn 2,000 coins total.', '🏦', 'coin_earned_total', 2000, 3, 3)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 20250722000018_gamification.sql
-- ---------------------------------------------------------------------------

-- Ecosystem M18: Gamification (XP, levels, quests, titles, leaderboard)

CREATE TYPE public.quest_cadence AS ENUM ('daily', 'weekly', 'monthly');

CREATE TABLE public.livecircuit_fan_gamification (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  prestige INTEGER NOT NULL DEFAULT 0 CHECK (prestige >= 0),
  equipped_title_slug TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.livecircuit_quest_defs (
  slug TEXT PRIMARY KEY,
  cadence public.quest_cadence NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  metric TEXT NOT NULL,
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  xp_reward INTEGER NOT NULL DEFAULT 25 CHECK (xp_reward >= 0),
  coin_reward INTEGER NOT NULL DEFAULT 0 CHECK (coin_reward >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_lc_quest_defs_cadence ON public.livecircuit_quest_defs(cadence, sort_order);

CREATE TABLE public.livecircuit_user_quest_progress (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_slug TEXT NOT NULL REFERENCES public.livecircuit_quest_defs(slug) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_slug, period_key)
);

CREATE TABLE public.livecircuit_xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  source_key TEXT NOT NULL,
  source_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_key)
);

CREATE INDEX idx_lc_xp_events_user ON public.livecircuit_xp_events(user_id, created_at DESC);

ALTER TABLE public.livecircuit_fan_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livecircuit_quest_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livecircuit_user_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livecircuit_xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fan gamification read own" ON public.livecircuit_fan_gamification
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public gamification leaderboard" ON public.livecircuit_fan_gamification
  FOR SELECT USING (true);
CREATE POLICY "Admin fan gamification" ON public.livecircuit_fan_gamification
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Quest defs public read" ON public.livecircuit_quest_defs FOR SELECT USING (true);
CREATE POLICY "Admin quest defs" ON public.livecircuit_quest_defs
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "Quest progress read own" ON public.livecircuit_user_quest_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin quest progress" ON public.livecircuit_user_quest_progress
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

CREATE POLICY "XP events read own" ON public.livecircuit_xp_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin xp events" ON public.livecircuit_xp_events
  FOR ALL USING (public.is_admin_profile()) WITH CHECK (public.is_admin_profile());

INSERT INTO public.livecircuit_quest_defs (slug, cadence, name, description, icon, metric, target_value, xp_reward, coin_reward, sort_order) VALUES
  ('daily_login', 'daily', 'Daily Check-in', 'Claim your daily coins or open LiveCircuit.', '☀️', 'daily_login', 1, 30, 10, 1),
  ('daily_review', 'daily', 'Voice of the Fan', 'Leave a review today.', '📝', 'reviews_today', 1, 40, 15, 2),
  ('daily_concourse', 'daily', 'Concourse Walk', 'Check in at a venue concourse.', '🚶', 'checkins_today', 1, 35, 10, 3),
  ('daily_tip', 'daily', 'Show Love', 'Tip an artist today.', '💸', 'tips_today', 1, 45, 20, 4),
  ('daily_social', 'daily', 'Say Hi', 'Send a friend message today.', '💬', 'friend_messages_today', 1, 30, 10, 5),
  ('weekly_tickets', 'weekly', 'Weekend Warrior', 'Attend 3 shows this week.', '🎫', 'tickets_week', 3, 120, 50, 1),
  ('weekly_reviews', 'weekly', 'Weekly Critic', 'Leave 3 reviews this week.', '📋', 'reviews_week', 3, 100, 40, 2),
  ('weekly_tips', 'weekly', 'Patron of the Week', 'Send 5 tips this week.', '🎁', 'tips_week', 5, 110, 45, 3),
  ('weekly_friends', 'weekly', 'Squad Goals', 'Gain 2 new friends this week.', '👥', 'friends_week', 2, 90, 35, 4),
  ('weekly_xp', 'weekly', 'XP Grinder', 'Earn 200 XP this week.', '⚡', 'xp_week', 200, 150, 60, 5),
  ('monthly_shows', 'monthly', 'Monthly Regular', 'Attend 10 shows this month.', '🎟️', 'tickets_month', 10, 300, 100, 1),
  ('monthly_venues', 'monthly', 'Venue Crawl', 'Visit 5 different venues this month.', '🏟️', 'venues_month', 5, 280, 90, 2),
  ('monthly_festivals', 'monthly', 'Festival Season', 'Join a festival pass this month.', '🎪', 'festivals_month', 1, 250, 80, 3),
  ('monthly_achievements', 'monthly', 'Trophy Case', 'Unlock 3 achievements this month.', '🏆', 'achievements_month', 3, 320, 120, 4),
  ('monthly_xp', 'monthly', 'Circuit Legend', 'Earn 1,000 XP this month.', '👑', 'xp_month', 1000, 400, 150, 5)
ON CONFLICT (slug) DO NOTHING;

