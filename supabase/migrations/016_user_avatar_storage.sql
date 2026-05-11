-- Photo de profil : URL publique + bucket Storage dédié

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN users.avatar_url IS 'URL publique de la photo (bucket Storage avatars)';

-- Bucket public pour affichage direct des images (<img src="...">)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Politiques : un utilisateur ne gère que le préfixe {son_uuid}/...
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
