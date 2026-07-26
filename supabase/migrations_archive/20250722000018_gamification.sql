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
