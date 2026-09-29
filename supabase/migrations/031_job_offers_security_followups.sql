-- Un clic compte une fois par personne et par offre.
DELETE FROM public.job_offer_clicks AS extra
WHERE extra.ctid IN (
  SELECT ctid
  FROM (
    SELECT
      ctid,
      row_number() OVER (PARTITION BY user_id, job_offer_id ORDER BY created_at, ctid) AS n
    FROM public.job_offer_clicks
  ) ranked
  WHERE ranked.n > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS job_offer_clicks_user_offer_key
  ON public.job_offer_clicks (user_id, job_offer_id);

-- Le jeu de démonstration n'est plus appelable par un utilisateur connecté.
DO $$
BEGIN
  IF to_regprocedure('public.seed_demo_job_offers()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.seed_demo_job_offers() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.seed_demo_job_offers() TO service_role;
  END IF;
END $$;
