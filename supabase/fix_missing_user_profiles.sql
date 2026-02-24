-- Script pour créer les profils utilisateurs manquants
-- À exécuter dans Supabase SQL Editor si vous avez des utilisateurs sans profil

-- Créer les profils manquants pour tous les utilisateurs existants dans auth.users
INSERT INTO public.users (id, email, first_name, last_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'first_name', ''),
  COALESCE(raw_user_meta_data->>'last_name', '')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Vérifier le résultat
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_public_users,
  COUNT(*) - (SELECT COUNT(*) FROM public.users) as missing_profiles
FROM auth.users;

