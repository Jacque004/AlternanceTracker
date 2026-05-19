-- Gestion des rôles administrateur depuis le panel admin

CREATE OR REPLACE FUNCTION public.admin_list_users(p_limit int DEFAULT 100)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_limit int;
  result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : droits administrateur requis'
      USING ERRCODE = '42501';
  END IF;

  safe_limit := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);

  SELECT COALESCE(
    (
      SELECT json_agg(row_to_json(t) ORDER BY t.created_at DESC)
      FROM (
        SELECT
          id,
          email,
          first_name,
          last_name,
          created_at,
          is_admin
        FROM public.users
        ORDER BY created_at DESC
        LIMIT safe_limit
      ) AS t
    ),
    '[]'::json
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_admin(
  p_user_id uuid,
  p_make_admin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : droits administrateur requis'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur invalide';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Utilisateur introuvable';
  END IF;

  IF auth.uid() = p_user_id AND p_make_admin = false THEN
    RAISE EXCEPTION 'Vous ne pouvez pas retirer vos propres droits administrateur';
  END IF;

  IF p_make_admin = false THEN
    SELECT count(*)::int INTO admin_count FROM public.users WHERE is_admin = true;
    IF admin_count <= 1 AND EXISTS (
      SELECT 1 FROM public.users WHERE id = p_user_id AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Impossible de retirer le dernier administrateur';
    END IF;
  END IF;

  UPDATE public.users
  SET is_admin = p_make_admin, updated_at = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_admin(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_admin(uuid, boolean) TO authenticated;
