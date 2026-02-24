-- Script pour corriger les politiques RLS pour permettre la création de profil
-- À exécuter dans Supabase SQL Editor

-- Supprimer l'ancienne politique d'insertion si elle existe
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Recréer la politique d'insertion avec une condition plus permissive
-- Cette politique permet à un utilisateur authentifié de créer son propre profil
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Alternative : Si vous voulez permettre la création via la fonction handle_new_user
-- Vous pouvez aussi créer une politique qui permet l'insertion si l'email correspond
-- (utile si le trigger ne fonctionne pas)
CREATE POLICY "Users can insert own profile by email"
  ON users FOR INSERT
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = users.id 
      AND auth.users.email = users.email
    )
  );

-- Vérifier que RLS est activé
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Vérifier les politiques existantes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

