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
