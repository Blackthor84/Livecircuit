-- Artist signup trigger diagnostics: surface PostgreSQL errors from create_artist_for_user

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
  row_count integer;
  v_constraint text;
  v_table text;
  v_column text;
  v_detail text;
  v_hint text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.artists WHERE user_id = p_user_id) THEN
    RAISE LOG 'create_artist_for_user skip existing user_id=%', p_user_id;
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

  RAISE LOG 'create_artist_for_user before artists INSERT user_id=% stage_name=% username=% generated_slug=%',
    p_user_id, p_stage_name, coalesce(p_username, ''), final_slug;

  BEGIN
    INSERT INTO public.artists (user_id, slug, stage_name, category)
    VALUES (
      p_user_id,
      final_slug,
      coalesce(nullif(trim(p_stage_name), ''), 'New Artist'),
      'music'::public.artist_category
    );

    GET DIAGNOSTICS row_count = ROW_COUNT;
    IF row_count = 0 THEN
      RAISE EXCEPTION
        'create_artist_for_user artists INSERT affected 0 rows. user_id=% stage_name=% username=% generated_slug=%',
        p_user_id, p_stage_name, coalesce(p_username, ''), final_slug;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS
        v_constraint = CONSTRAINT_NAME,
        v_table = TABLE_NAME,
        v_column = COLUMN_NAME,
        v_detail = PG_EXCEPTION_DETAIL,
        v_hint = PG_EXCEPTION_HINT;
      RAISE EXCEPTION
        'create_artist_for_user artists INSERT failed. SQLSTATE=% SQLERRM=% CONSTRAINT=% TABLE=% COLUMN=% DETAIL=% HINT=% user_id=% stage_name=% username=% generated_slug=%',
        SQLSTATE, SQLERRM, v_constraint, v_table, v_column, v_detail, v_hint,
        p_user_id, p_stage_name, coalesce(p_username, ''), final_slug;
  END;

  IF normalized_username = '' THEN
    RAISE LOG 'create_artist_for_user before profiles username UPDATE user_id=% generated_slug=%',
      p_user_id, final_slug;

    BEGIN
      UPDATE public.profiles
      SET username = final_slug
      WHERE id = p_user_id AND username IS NULL;

      GET DIAGNOSTICS row_count = ROW_COUNT;
      IF row_count = 0 THEN
        RAISE LOG 'create_artist_for_user profiles username UPDATE skipped (username already set) user_id=%',
          p_user_id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
          v_constraint = CONSTRAINT_NAME,
          v_table = TABLE_NAME,
          v_column = COLUMN_NAME,
          v_detail = PG_EXCEPTION_DETAIL,
          v_hint = PG_EXCEPTION_HINT;
        RAISE EXCEPTION
          'create_artist_for_user profiles username UPDATE failed. SQLSTATE=% SQLERRM=% CONSTRAINT=% TABLE=% COLUMN=% DETAIL=% HINT=% user_id=% generated_slug=%',
          SQLSTATE, SQLERRM, v_constraint, v_table, v_column, v_detail, v_hint,
          p_user_id, final_slug;
    END;
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
