-- Agency profile fields and signup trigger (requires user_role.agency from prior migration)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_agency_id UUID REFERENCES public.agency_organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agency_member_role public.agency_member_role;

CREATE INDEX IF NOT EXISTS idx_profiles_primary_agency ON public.profiles(primary_agency_id)
  WHERE primary_agency_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_agency_role ON public.profiles(role)
  WHERE role = 'agency';

-- Signup trigger: accept intended_role agency
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
      WHEN intended IN ('fan', 'artist', 'admin', 'agency') THEN intended::public.user_role
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

  BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url, role, username)
    VALUES (NEW.id, display, NEW.raw_user_meta_data->>'avatar_url', resolved_role, username_val)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION
        'handle_new_user profiles INSERT failed. SQLSTATE=% SQLERRM=% user_id=% username=% display=% role=%',
        SQLSTATE,
        SQLERRM,
        NEW.id,
        coalesce(username_val, ''),
        display,
        resolved_role;
  END;

  IF resolved_role = 'artist' THEN
    BEGIN
      PERFORM public.create_artist_for_user(NEW.id, display, username_val);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION
          'create_artist_for_user failed. SQLSTATE=% SQLERRM=% user_id=% username=% display=%',
          SQLSTATE,
          SQLERRM,
          NEW.id,
          coalesce(username_val, ''),
          display;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON COLUMN public.profiles.primary_agency_id IS 'Primary agency org for accounts with role=agency';
COMMENT ON COLUMN public.profiles.agency_member_role IS 'Agency team role for accounts with role=agency';
