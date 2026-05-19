-- Rôle administrateur et statistiques globales (panel admin)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.is_admin IS 'Accès au panneau d''administration';

CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- Vérifie si l'utilisateur connecté est admin (contourne RLS pour la lecture de sa propre ligne)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT u.is_admin FROM public.users u WHERE u.id = auth.uid()),
    false
  );
$$;

-- Statistiques agrégées réservées aux administrateurs
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : droits administrateur requis'
      USING ERRCODE = '42501';
  END IF;

  SELECT json_build_object(
    'usersCount', (SELECT count(*)::int FROM public.users),
    'applicationsCount', (SELECT count(*)::int FROM public.applications),
    'applicationsByStatus', COALESCE(
      (
        SELECT json_object_agg(status, cnt)
        FROM (
          SELECT status, count(*)::int AS cnt
          FROM public.applications
          GROUP BY status
        ) AS status_counts
      ),
      '{}'::json
    ),
    'usersLast7Days', (
      SELECT count(*)::int FROM public.users
      WHERE created_at >= (now() - interval '7 days')
    ),
    'applicationsLast7Days', (
      SELECT count(*)::int FROM public.applications
      WHERE created_at >= (now() - interval '7 days')
    ),
    'recentUsers', COALESCE(
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
          LIMIT 15
        ) AS t
      ),
      '[]'::json
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;
