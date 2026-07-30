-- Fix ambiguous create_artist_for_user overload (42725): drop legacy (uuid, text), keep canonical 3-arg version

DROP FUNCTION IF EXISTS public.create_artist_for_user(uuid, text);

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

-- Profile role trigger: always call 3-arg version explicitly (no ambiguous 2-arg call)
CREATE OR REPLACE FUNCTION public.on_profile_role_artist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'artist' AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM NEW.role) THEN
    PERFORM public.create_artist_for_user(
      NEW.id,
      NEW.display_name,
      NEW.username
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
