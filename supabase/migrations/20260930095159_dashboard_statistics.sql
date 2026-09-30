-- Statistiques du tableau de bord : une agrégation par appel, limitée à l'utilisateur connecté.

CREATE OR REPLACE FUNCTION public.dashboard_statistics(p_week_start date)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  result json;
  letters_count integer := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User not authenticated'
      USING ERRCODE = '42501';
  END IF;

  IF p_week_start IS NULL THEN
    RAISE EXCEPTION 'p_week_start is required'
      USING ERRCODE = '22023';
  END IF;

  IF to_regclass('public.generated_letters') IS NOT NULL THEN
    SELECT count(*)::int
    INTO letters_count
    FROM public.generated_letters
    WHERE user_id = uid
      AND created_at >= p_week_start;
  END IF;

  WITH mine AS (
    SELECT status, application_date, response_date, created_at, last_relance_at
    FROM public.applications
    WHERE user_id = uid
  ),
  totals AS (
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE response_date IS NOT NULL)::int AS responded,
      count(*) FILTER (WHERE created_at >= p_week_start)::int AS applications_this_week,
      count(*) FILTER (WHERE last_relance_at >= p_week_start)::int AS relances_this_week,
      count(*) FILTER (WHERE status = 'to_apply')::int AS to_apply,
      count(*) FILTER (WHERE status = 'pending')::int AS pending,
      count(*) FILTER (WHERE status = 'followed_up')::int AS followed_up,
      count(*) FILTER (WHERE status = 'interview')::int AS interview,
      count(*) FILTER (WHERE status = 'accepted')::int AS accepted,
      count(*) FILTER (WHERE status = 'rejected')::int AS rejected
    FROM mine
  ),
  statuses AS (
    SELECT COALESCE(json_object_agg(status, cnt), '{}'::json) AS distribution
    FROM (
      SELECT status, count(*)::int AS cnt
      FROM mine
      GROUP BY status
    ) grouped
  ),
  months AS (
    SELECT COALESCE(
      json_agg(
        json_build_object('month', month_key, 'count', cnt)
        ORDER BY month_key
      ),
      '[]'::json
    ) AS monthly
    FROM (
      SELECT to_char(application_date, 'YYYY-MM') AS month_key, count(*)::int AS cnt
      FROM mine
      WHERE application_date IS NOT NULL
      GROUP BY 1
    ) grouped
  )
  SELECT json_build_object(
    'total', totals.total,
    'statusDistribution', statuses.distribution,
    'monthlyData', months.monthly,
    'responseRate', CASE
      WHEN totals.total > 0 THEN round((totals.responded::numeric / totals.total) * 100, 2)
      ELSE 0
    END,
    'responded', totals.responded,
    'toApply', totals.to_apply,
    'pending', totals.pending,
    'followedUp', totals.followed_up,
    'interview', totals.interview,
    'accepted', totals.accepted,
    'rejected', totals.rejected,
    'applicationsThisWeek', totals.applications_this_week,
    'relancesThisWeek', totals.relances_this_week,
    'lettersThisWeek', letters_count
  )
  INTO result
  FROM totals
  CROSS JOIN statuses
  CROSS JOIN months;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_statistics(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_statistics(date) TO authenticated, service_role;
