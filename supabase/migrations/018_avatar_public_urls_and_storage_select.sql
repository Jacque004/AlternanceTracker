-- URLs avatar corrigées : le segment /public/ est obligatoire pour un bucket public.
UPDATE public.users
SET avatar_url = replace(avatar_url, '/storage/v1/object/avatars/', '/storage/v1/object/public/avatars/')
WHERE avatar_url IS NOT NULL
  AND avatar_url LIKE '%/storage/v1/object/avatars/%'
  AND avatar_url NOT LIKE '%/storage/v1/object/public/avatars/%';

-- Lecture anonyme des objets du bucket public (affichage <img src="…"> sans JWT).
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
