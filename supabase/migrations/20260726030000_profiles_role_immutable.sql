-- Role is assigned once at profile creation and never changed afterward except by
-- trusted database contexts (postgres / service_role) or admin-table promotion.

CREATE OR REPLACE FUNCTION public.profiles_is_trusted_role_writer()
RETURNS boolean AS $$
DECLARE
  jwt_role text := coalesce(auth.role(), '');
  db_role text := coalesce(current_setting('role', true), session_user);
BEGIN
  RETURN jwt_role IN ('service_role', 'supabase_admin')
    OR db_role IN ('postgres', 'supabase_admin', 'supabase_storage_admin')
    OR session_user IN ('postgres', 'supabase_admin')
    OR coalesce(current_setting('app.profile_bootstrap', true), '') = '1';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.profiles_prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.profiles_is_trusted_role_writer() THEN
      RETURN NEW;
    END IF;
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.profiles_guard_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.profiles_is_trusted_role_writer() THEN
    RAISE EXCEPTION 'Profile rows are created automatically at signup';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_insert_guard ON public.profiles;
CREATE TRIGGER profiles_insert_guard
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_insert();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  intended text;
  resolved_role public.user_role;
  display text;
  profile_count bigint;
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

  PERFORM set_config('app.profile_bootstrap', '1', true);

  INSERT INTO public.profiles (id, display_name, avatar_url, role)
  VALUES (NEW.id, display, NEW.raw_user_meta_data->>'avatar_url', resolved_role)
  ON CONFLICT (id) DO NOTHING;

  IF resolved_role = 'artist' THEN
    PERFORM public.create_artist_for_user(NEW.id, display);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_profile_admin_from_admins()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM set_config('app.profile_bootstrap', '1', true);

  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = NEW.user_id
    AND role IN ('fan', 'artist');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop duplicate INSERT policy that allowed clients to recreate profiles as fan.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
