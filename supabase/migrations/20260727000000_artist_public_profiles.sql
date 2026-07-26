-- Public artist profile vanity URLs: username sync, redirects, extended profile fields

ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS years_performing INTEGER,
  ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS booking_email TEXT,
  ADD COLUMN IF NOT EXISTS short_bio TEXT;

CREATE TABLE IF NOT EXISTS public.username_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_username TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_username_redirects_user ON public.username_redirects(user_id);

ALTER TABLE public.username_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Username redirects public read" ON public.username_redirects;
CREATE POLICY "Username redirects public read" ON public.username_redirects FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.normalize_username(input text)
RETURNS text AS $$
  SELECT lower(trim(coalesce(input, '')));
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.create_artist_for_user(
  p_user_id uuid,
  p_stage_name text,
  p_username text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  base_slug text;
  final_slug text;
  suffix int := 0;
  normalized_username text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.artists WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  normalized_username := public.normalize_username(p_username);

  IF normalized_username <> '' THEN
    base_slug := normalized_username;
  ELSE
    base_slug := public.slugify_stage_name(p_stage_name);
    IF base_slug = '' THEN
      base_slug := 'artist';
    END IF;
  END IF;

  final_slug := base_slug;

  WHILE EXISTS (
    SELECT 1 FROM public.artists WHERE slug = final_slug
    UNION ALL
    SELECT 1 FROM public.profiles WHERE username = final_slug
    UNION ALL
    SELECT 1 FROM public.username_redirects WHERE old_username = final_slug
  ) LOOP
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

  IF normalized_username = '' THEN
    UPDATE public.profiles
    SET username = final_slug
    WHERE id = p_user_id AND username IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  intended text;
  resolved_role public.user_role;
  display text;
  profile_count bigint;
  username_val text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO profile_count FROM public.profiles;

  IF profile_count = 0 THEN
    resolved_role := 'super_admin'::public.user_role;
  ELSE
    intended := lower(coalesce(NEW.raw_user_meta_data->>'intended_role', 'fan'));
    resolved_role := CASE
      WHEN intended IN ('fan', 'artist', 'admin') THEN intended::public.user_role
      ELSE 'fan'::public.user_role
    END;
  END IF;

  display := coalesce(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  username_val := public.normalize_username(NEW.raw_user_meta_data->>'username');
  IF username_val = '' THEN
    username_val := NULL;
  END IF;

  PERFORM set_config('app.profile_bootstrap', '1', true);

  INSERT INTO public.profiles (id, display_name, avatar_url, role, username)
  VALUES (NEW.id, display, NEW.raw_user_meta_data->>'avatar_url', resolved_role, username_val)
  ON CONFLICT (id) DO NOTHING;

  IF resolved_role = 'artist' THEN
    PERFORM public.create_artist_for_user(NEW.id, display, username_val);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
