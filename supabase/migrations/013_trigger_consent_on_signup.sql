-- Mise à jour du trigger d'inscription pour enregistrer les consentements (RGPD)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_privacy_at TIMESTAMP WITH TIME ZONE;
  v_terms_at TIMESTAMP WITH TIME ZONE;
BEGIN
  v_privacy_at := NULL;
  v_terms_at := NULL;
  IF NEW.raw_user_meta_data->>'privacy_policy_accepted_at' IS NOT NULL AND TRIM(NEW.raw_user_meta_data->>'privacy_policy_accepted_at') != '' THEN
    v_privacy_at := (NEW.raw_user_meta_data->>'privacy_policy_accepted_at')::timestamptz;
  END IF;
  IF NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL AND TRIM(NEW.raw_user_meta_data->>'terms_accepted_at') != '' THEN
    v_terms_at := (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz;
  END IF;

  INSERT INTO public.users (id, email, first_name, last_name, privacy_policy_accepted_at, terms_accepted_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_privacy_at,
    v_terms_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
