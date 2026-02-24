-- Fonction pour créer le profil utilisateur si nécessaire
-- Cette fonction utilise SECURITY DEFINER pour contourner RLS
-- et peut être appelée depuis le client

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Récupérer l'ID et l'email de l'utilisateur authentifié
  v_user_id := auth.uid();
  v_user_email := auth.email();
  
  -- Vérifier si l'utilisateur est authentifié
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Vérifier si le profil existe déjà
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    -- Créer le profil utilisateur
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (
      v_user_id,
      v_user_email,
      COALESCE((SELECT raw_user_meta_data->>'first_name' FROM auth.users WHERE id = v_user_id), ''),
      COALESCE((SELECT raw_user_meta_data->>'last_name' FROM auth.users WHERE id = v_user_id), '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;

-- Donner les permissions d'exécution à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO anon;
