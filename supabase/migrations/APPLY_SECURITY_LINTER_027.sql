-- Exécuter dans Supabase → SQL Editor (New query → Run)
-- Copie de 027_security_linter_hardening.sql
-- Durcissement linter Supabase â€” idempotent (rejouable si une fonction manque ou a dÃ©jÃ  Ã©tÃ© dÃ©placÃ©e)
--
-- Non couvert en SQL : Dashboard Auth â†’ Attack Protection â†’ Leaked password protection

-- ---------------------------------------------------------------------------
-- 1) search_path figÃ© uniquement si la fonction existe
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.update_updated_at_column()',
    'public.oauth_meta_first_name(jsonb)',
    'public.oauth_meta_last_name(jsonb)',
    'public.oauth_meta_avatar_url(jsonb)',
    'public.handle_new_user()',
    'public.application_status_label(text)',
    'public.applications_pipeline_side_effects()',
    'public.log_application_events()',
    'private.handle_new_user()',
    'private.log_application_events()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Triggers SECURITY DEFINER dans private (crÃ©Ã©s ici, pas un ALTER du public)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;

CREATE OR REPLACE FUNCTION public.oauth_meta_first_name(meta jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(meta->>'first_name'), ''),
    NULLIF(TRIM(meta->>'given_name'), ''),
    NULLIF(TRIM(SPLIT_PART(COALESCE(meta->>'full_name', meta->>'name', ''), ' ', 1)), ''),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.oauth_meta_last_name(meta jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(meta->>'last_name'), ''),
    NULLIF(TRIM(meta->>'family_name'), ''),
    NULLIF(
      TRIM(
        REGEXP_REPLACE(
          COALESCE(meta->>'full_name', meta->>'name', ''),
          '^\S+\s*',
          ''
        )
      ),
      ''
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.oauth_meta_avatar_url(meta jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(meta->>'avatar_url'), ''),
    NULLIF(TRIM(meta->>'picture'), '')
  );
$$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_privacy_at TIMESTAMP WITH TIME ZONE;
  v_terms_at TIMESTAMP WITH TIME ZONE;
  v_meta jsonb;
BEGIN
  v_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  v_privacy_at := NULL;
  v_terms_at := NULL;
  IF v_meta->>'privacy_policy_accepted_at' IS NOT NULL AND TRIM(v_meta->>'privacy_policy_accepted_at') != '' THEN
    v_privacy_at := (v_meta->>'privacy_policy_accepted_at')::timestamptz;
  END IF;
  IF v_meta->>'terms_accepted_at' IS NOT NULL AND TRIM(v_meta->>'terms_accepted_at') != '' THEN
    v_terms_at := (v_meta->>'terms_accepted_at')::timestamptz;
  END IF;

  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    privacy_policy_accepted_at,
    terms_accepted_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    public.oauth_meta_first_name(v_meta),
    public.oauth_meta_last_name(v_meta),
    public.oauth_meta_avatar_url(v_meta),
    v_privacy_at,
    v_terms_at
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.log_application_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  summary TEXT;
  skip_interview_log BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO application_events (
      application_id, user_id, event_type, from_status, to_status, summary, metadata, created_at
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'created',
      NULL,
      NEW.status,
      'Candidature crÃ©Ã©e Â· ' || application_status_label(NEW.status),
      jsonb_build_object('status', NEW.status),
      COALESCE(NEW.created_at, NOW())
    );
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'followed_up' THEN
      summary := 'RelancÃ© le ' || to_char(NOW() AT TIME ZONE 'Europe/Paris', 'DD/MM');
    ELSIF NEW.status = 'pending' THEN
      summary := 'EnvoyÃ©e le ' || to_char(COALESCE(NEW.application_date, CURRENT_DATE), 'DD/MM');
    ELSIF NEW.status = 'interview' THEN
      IF NEW.interview_date IS NOT NULL THEN
        summary := 'Entretien prÃ©vu le ' || to_char(NEW.interview_date, 'DD/MM');
        skip_interview_log := TRUE;
      ELSE
        summary := 'PassÃ© en entretien';
      END IF;
    ELSIF NEW.status = 'accepted' THEN
      summary := 'Offre le ' || to_char(COALESCE(NEW.response_date, CURRENT_DATE), 'DD/MM');
    ELSIF NEW.status = 'rejected' THEN
      summary := 'Refus le ' || to_char(COALESCE(NEW.response_date, CURRENT_DATE), 'DD/MM');
    ELSIF NEW.status = 'to_apply' THEN
      summary := 'Remis dans Ã€ postuler';
    ELSE
      summary := application_status_label(OLD.status) || ' â†’ ' || application_status_label(NEW.status);
    END IF;

    INSERT INTO application_events (
      application_id, user_id, event_type, from_status, to_status, summary, metadata
    ) VALUES (
      NEW.id,
      NEW.user_id,
      CASE WHEN NEW.status = 'followed_up' THEN 'relance' ELSE 'status_change' END,
      OLD.status,
      NEW.status,
      summary,
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  ELSIF NEW.last_relance_at IS DISTINCT FROM OLD.last_relance_at THEN
    INSERT INTO application_events (
      application_id, user_id, event_type, from_status, to_status, summary, metadata
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'relance',
      OLD.status,
      NEW.status,
      'RelancÃ© le ' || to_char(NOW() AT TIME ZONE 'Europe/Paris', 'DD/MM'),
      jsonb_build_object('last_relance_at', NEW.last_relance_at)
    );
  END IF;

  IF NOT skip_interview_log
     AND (
       NEW.interview_date IS DISTINCT FROM OLD.interview_date
       OR NEW.interview_time IS DISTINCT FROM OLD.interview_time
       OR NEW.interview_place IS DISTINCT FROM OLD.interview_place
     ) THEN
    IF OLD.interview_date IS NOT NULL
       AND NEW.interview_date IS DISTINCT FROM OLD.interview_date THEN
      summary := 'Entretien dÃ©placÃ© du '
        || to_char(OLD.interview_date, 'DD/MM')
        || ' au '
        || COALESCE(to_char(NEW.interview_date, 'DD/MM'), 'â€”');
    ELSIF OLD.interview_date IS NULL AND NEW.interview_date IS NOT NULL THEN
      summary := 'Entretien prÃ©vu le ' || to_char(NEW.interview_date, 'DD/MM');
    ELSIF NEW.interview_time IS DISTINCT FROM OLD.interview_time THEN
      summary := 'Heure d''entretien mise Ã  jour';
    ELSIF NEW.interview_place IS DISTINCT FROM OLD.interview_place THEN
      summary := 'Lieu d''entretien mis Ã  jour';
    ELSE
      summary := 'Entretien mis Ã  jour';
    END IF;

    INSERT INTO application_events (
      application_id, user_id, event_type, from_status, to_status, summary, metadata
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'interview_changed',
      OLD.status,
      NEW.status,
      summary,
      jsonb_build_object(
        'from_date', OLD.interview_date,
        'to_date', NEW.interview_date,
        'from_time', OLD.interview_time,
        'to_time', NEW.interview_time
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.handle_new_user();

DROP TRIGGER IF EXISTS applications_log_events_insert ON applications;
DROP TRIGGER IF EXISTS applications_log_events_update ON applications;
DROP FUNCTION IF EXISTS public.log_application_events();

CREATE TRIGGER applications_log_events_insert
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION private.log_application_events();

CREATE TRIGGER applications_log_events_update
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION private.log_application_events();

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.log_application_events() TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION private.log_application_events() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.log_application_events() FROM anon;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT USAGE ON SCHEMA private TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION private.handle_new_user() TO supabase_auth_admin;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) is_admin en INVOKER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT u.is_admin FROM public.users u WHERE u.id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- 4) EXECUTE : PUBLIC / anon retirÃ©s si la fonction existe
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('public.update_updated_at_column()', true),
        ('public.applications_pipeline_side_effects()', true),
        ('public.oauth_meta_first_name(jsonb)', false),
        ('public.oauth_meta_last_name(jsonb)', false),
        ('public.oauth_meta_avatar_url(jsonb)', false),
        ('public.application_status_label(text)', false),
        ('public.ensure_user_profile()', true),
        ('public.is_admin()', true),
        ('public.admin_get_stats()', true),
        ('public.admin_list_users(integer)', true),
        ('public.admin_set_user_admin(uuid, boolean)', true)
    ) AS t(fn, grant_auth)
  LOOP
    IF to_regprocedure(rec.fn) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', rec.fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', rec.fn);
    IF rec.grant_auth THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', rec.fn);
    ELSE
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', rec.fn);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Bucket avatars
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_own" ON storage.objects;
CREATE POLICY "avatars_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 6) pg_net hors de public
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  ext_schema text;
BEGIN
  SELECT n.nspname
  INTO ext_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pg_net';

  IF ext_schema = 'public' THEN
    CREATE SCHEMA IF NOT EXISTS extensions;
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'DÃ©placement de pg_net ignorÃ© : %', SQLERRM;
END $$;
