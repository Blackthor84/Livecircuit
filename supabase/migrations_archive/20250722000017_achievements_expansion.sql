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
