-- Preserve manually assigned roles (e.g. super_admin) and only block client JWT escalation.

CREATE OR REPLACE FUNCTION public.profiles_prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  jwt_role text := coalesce(auth.role(), '');
  db_role text := coalesce(current_setting('role', true), session_user);
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    -- Trusted writers: service role JWT, postgres, and Supabase maintenance roles.
    IF jwt_role IN ('service_role', 'supabase_admin')
       OR db_role IN ('postgres', 'supabase_admin', 'supabase_storage_admin')
       OR session_user IN ('postgres', 'supabase_admin')
    THEN
      RETURN NEW;
    END IF;

    -- Authenticated clients may not change their own role after signup.
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Promote to admin without downgrading super_admin (or re-promoting existing admins).
CREATE OR REPLACE FUNCTION public.sync_profile_admin_from_admins()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = NEW.user_id
    AND role IN ('fan', 'artist');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Signup trigger: create profile once; never overwrite role if row already exists.
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
  VALUES (NEW.id, display, NEW.raw_user_meta_data->>'avatar_url', resolved_role)
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
    -- role intentionally omitted: preserve manual / promoted roles

  IF resolved_role = 'artist' THEN
    PERFORM public.create_artist_for_user(NEW.id, display);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
