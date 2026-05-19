-- Statistiques admin : candidatures par mois (toutes les utilisateurs)

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
    'monthlyData', COALESCE(
      (
        SELECT json_agg(
          json_build_object('month', month_key, 'count', cnt)
          ORDER BY month_key
        )
        FROM (
          SELECT to_char(application_date, 'YYYY-MM') AS month_key, count(*)::int AS cnt
          FROM public.applications
          WHERE application_date IS NOT NULL
          GROUP BY to_char(application_date, 'YYYY-MM')
        ) AS monthly_counts
      ),
      '[]'::json
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
