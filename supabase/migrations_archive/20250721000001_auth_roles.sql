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
