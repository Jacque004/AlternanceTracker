-- Profils utilisateurs créés via OAuth (Google) : noms et avatar depuis user_metadata
CREATE OR REPLACE FUNCTION public.oauth_meta_first_name(meta jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
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
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(meta->>'avatar_url'), ''),
    NULLIF(TRIM(meta->>'picture'), '')
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_meta jsonb;
BEGIN
  v_user_id := auth.uid();
  v_user_email := auth.email();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT COALESCE(raw_user_meta_data, '{}'::jsonb)
  INTO v_meta
  FROM auth.users
  WHERE id = v_user_id;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    INSERT INTO public.users (id, email, first_name, last_name, avatar_url)
    VALUES (
      v_user_id,
      v_user_email,
      public.oauth_meta_first_name(v_meta),
      public.oauth_meta_last_name(v_meta),
      public.oauth_meta_avatar_url(v_meta)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;
