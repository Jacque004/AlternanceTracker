-- RGPD : version des documents, âge minimum, conservation, photos privées.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT,
  ADD COLUMN IF NOT EXISTS terms_version TEXT,
  ADD COLUMN IF NOT EXISTS minimum_age_confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS inactivity_warning_sent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.users.privacy_policy_version IS 'Version de la politique de confidentialité acceptée';
COMMENT ON COLUMN public.users.terms_version IS 'Version des CGU acceptées';
COMMENT ON COLUMN public.users.minimum_age_confirmed_at IS 'Confirmation d''avoir au moins 15 ans';
COMMENT ON COLUMN public.users.last_seen_at IS 'Dernière ouverture de session dans l''application';
COMMENT ON COLUMN public.users.inactivity_warning_sent_at IS 'E-mail prévenant d''une suppression pour inactivité';
COMMENT ON COLUMN public.users.avatar_url IS 'Chemin dans le bucket privé avatars, ou URL de la photo Google';

UPDATE public.users
SET last_seen_at = COALESCE(updated_at, created_at, NOW())
WHERE last_seen_at IS NULL;

-- Le bucket public ignore les politiques de lecture. On le passe en privé.
UPDATE storage.buckets
SET public = false
WHERE id = 'avatars';

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_own" ON storage.objects;
CREATE POLICY "avatars_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_privacy_at TIMESTAMP WITH TIME ZONE;
  v_terms_at TIMESTAMP WITH TIME ZONE;
  v_age_at TIMESTAMP WITH TIME ZONE;
  v_meta jsonb;
BEGIN
  v_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  v_privacy_at := NULL;
  v_terms_at := NULL;
  v_age_at := NULL;
  IF v_meta->>'privacy_policy_accepted_at' IS NOT NULL AND TRIM(v_meta->>'privacy_policy_accepted_at') != '' THEN
    v_privacy_at := (v_meta->>'privacy_policy_accepted_at')::timestamptz;
  END IF;
  IF v_meta->>'terms_accepted_at' IS NOT NULL AND TRIM(v_meta->>'terms_accepted_at') != '' THEN
    v_terms_at := (v_meta->>'terms_accepted_at')::timestamptz;
  END IF;
  IF v_meta->>'minimum_age_confirmed_at' IS NOT NULL AND TRIM(v_meta->>'minimum_age_confirmed_at') != '' THEN
    v_age_at := (v_meta->>'minimum_age_confirmed_at')::timestamptz;
  END IF;

  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    privacy_policy_accepted_at,
    terms_accepted_at,
    privacy_policy_version,
    terms_version,
    minimum_age_confirmed_at,
    last_seen_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    public.oauth_meta_first_name(v_meta),
    public.oauth_meta_last_name(v_meta),
    public.oauth_meta_avatar_url(v_meta),
    v_privacy_at,
    v_terms_at,
    NULLIF(TRIM(v_meta->>'privacy_policy_version'), ''),
    NULLIF(TRIM(v_meta->>'terms_version'), ''),
    v_age_at,
    NOW()
  );
  RETURN NEW;
END;
$$;

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
  v_privacy_at TIMESTAMP WITH TIME ZONE;
  v_terms_at TIMESTAMP WITH TIME ZONE;
  v_age_at TIMESTAMP WITH TIME ZONE;
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

  v_privacy_at := NULL;
  v_terms_at := NULL;
  v_age_at := NULL;
  IF v_meta->>'privacy_policy_accepted_at' IS NOT NULL AND TRIM(v_meta->>'privacy_policy_accepted_at') != '' THEN
    v_privacy_at := (v_meta->>'privacy_policy_accepted_at')::timestamptz;
  END IF;
  IF v_meta->>'terms_accepted_at' IS NOT NULL AND TRIM(v_meta->>'terms_accepted_at') != '' THEN
    v_terms_at := (v_meta->>'terms_accepted_at')::timestamptz;
  END IF;
  IF v_meta->>'minimum_age_confirmed_at' IS NOT NULL AND TRIM(v_meta->>'minimum_age_confirmed_at') != '' THEN
    v_age_at := (v_meta->>'minimum_age_confirmed_at')::timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    INSERT INTO public.users (
      id,
      email,
      first_name,
      last_name,
      avatar_url,
      privacy_policy_accepted_at,
      terms_accepted_at,
      privacy_policy_version,
      terms_version,
      minimum_age_confirmed_at,
      last_seen_at
    )
    VALUES (
      v_user_id,
      v_user_email,
      public.oauth_meta_first_name(v_meta),
      public.oauth_meta_last_name(v_meta),
      public.oauth_meta_avatar_url(v_meta),
      v_privacy_at,
      v_terms_at,
      NULLIF(TRIM(v_meta->>'privacy_policy_version'), ''),
      NULLIF(TRIM(v_meta->>'terms_version'), ''),
      v_age_at,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;
