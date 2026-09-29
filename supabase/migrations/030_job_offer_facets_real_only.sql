-- Les filtres de recherche ne proposent que les offres réelles.
CREATE OR REPLACE FUNCTION public.job_offer_facets()
RETURNS json
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT json_build_object(
    'domains', COALESCE((
      SELECT json_agg(d ORDER BY d)
      FROM (
        SELECT DISTINCT domain AS d
        FROM public.job_offers
        WHERE status = 'active'
          AND is_demo = false
          AND domain IS NOT NULL
          AND btrim(domain) <> ''
      ) q
    ), '[]'::json),
    'educationLevels', COALESCE((
      SELECT json_agg(d ORDER BY d)
      FROM (
        SELECT DISTINCT education_level AS d
        FROM public.job_offers
        WHERE status = 'active'
          AND is_demo = false
          AND education_level IS NOT NULL
          AND btrim(education_level) <> ''
      ) q
    ), '[]'::json),
    'sources', COALESCE((
      SELECT json_agg(d ORDER BY d)
      FROM (
        SELECT DISTINCT source AS d
        FROM public.job_offers
        WHERE status = 'active'
          AND is_demo = false
          AND btrim(source) <> ''
      ) q
    ), '[]'::json)
  );
$$;
