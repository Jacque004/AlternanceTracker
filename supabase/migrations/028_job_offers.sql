-- Offres d'emploi découvertes hors du pipeline de candidatures.
--
-- Lecture : utilisateurs authentifiés (y compris une offre expirée ouverte par son URL).
-- Écriture des offres : service role uniquement (Edge Function collect-job-offers).
-- Aucune policy INSERT / UPDATE / DELETE pour authenticated ou anon sur job_offers.
--
-- Lien futur vers le pipeline : applications.job_offer_id (nullable).
-- Le statut d'une candidature créée depuis une offre doit être « to_apply ».
--
-- Planification (non exécutée ici) : même modèle que 007_cron_schedule_notifications.sql.
-- POST https://VOTRE_PROJECT_REF.supabase.co/functions/v1/collect-job-offers
-- Authorization: Bearer VOTRE_CRON_SECRET
-- Fréquence conseillée : une fois par jour. Ne pas descendre sous l'heure :
-- l'API La bonne alternance est limitée (60 appels / minute sur /job/v1/search).

CREATE TABLE IF NOT EXISTS job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  contract_type TEXT,
  education_level TEXT,
  domain TEXT,
  salary TEXT,
  remote BOOLEAN,
  description TEXT,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  external_id TEXT,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  fingerprint TEXT NOT NULL,
  dedupe_key TEXT GENERATED ALWAYS AS (
    CASE
      WHEN external_id IS NOT NULL AND btrim(external_id) <> ''
        THEN source || chr(10) || external_id
      ELSE source || chr(10) || 'url:' || source_url
    END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT job_offers_status_check CHECK (status IN ('active', 'expired')),
  CONSTRAINT job_offers_title_len CHECK (char_length(btrim(title)) BETWEEN 1 AND 300),
  CONSTRAINT job_offers_company_len CHECK (char_length(btrim(company_name)) BETWEEN 1 AND 255),
  CONSTRAINT job_offers_source_len CHECK (char_length(btrim(source)) BETWEEN 1 AND 80),
  CONSTRAINT job_offers_source_url_http CHECK (source_url ~* '^https?://'),
  CONSTRAINT job_offers_dedupe_key_key UNIQUE (dedupe_key),
  CONSTRAINT job_offers_source_url_key UNIQUE (source, source_url)
);

COMMENT ON TABLE job_offers IS 'Offres normalisées pour la découverte. Pas le pipeline de candidatures.';
COMMENT ON COLUMN job_offers.is_demo IS 'Vrai uniquement pour le connecteur de démonstration. Ce ne sont pas de vraies offres.';
COMMENT ON COLUMN job_offers.dedupe_key IS 'Unicité source+external_id, sinon source+source_url.';
COMMENT ON COLUMN job_offers.fingerprint IS 'company+title+location normalisés, pour ignorer un doublon inter-sources sans contrainte unique.';

CREATE INDEX IF NOT EXISTS idx_job_offers_title ON job_offers (title);
CREATE INDEX IF NOT EXISTS idx_job_offers_company_name ON job_offers (company_name);
CREATE INDEX IF NOT EXISTS idx_job_offers_location ON job_offers (location);
CREATE INDEX IF NOT EXISTS idx_job_offers_published_at ON job_offers (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_offers_status ON job_offers (status);
CREATE INDEX IF NOT EXISTS idx_job_offers_source ON job_offers (source);
CREATE INDEX IF NOT EXISTS idx_job_offers_status_published ON job_offers (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_offers_fingerprint ON job_offers (fingerprint);

DROP TRIGGER IF EXISTS update_job_offers_updated_at ON job_offers;
CREATE TRIGGER update_job_offers_updated_at
  BEFORE UPDATE ON job_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS job_offer_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_offer_id UUID NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE job_offer_clicks IS 'Clic sur « Voir l''offre ». Pas d''autre donnée personnelle.';

CREATE INDEX IF NOT EXISTS idx_job_offer_clicks_offer ON job_offer_clicks (job_offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_offer_clicks_user ON job_offer_clicks (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS job_offer_collection_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  sources TEXT[] NOT NULL DEFAULT '{}',
  fetched_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  expired_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  CONSTRAINT job_offer_collection_runs_status_check CHECK (status IN ('running', 'success', 'error'))
);

COMMENT ON TABLE job_offer_collection_runs IS 'Journal des collectes. Lisible seulement via admin_get_job_offer_stats.';

CREATE INDEX IF NOT EXISTS idx_job_offer_collection_runs_started ON job_offer_collection_runs (started_at DESC);

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS job_offer_id UUID REFERENCES job_offers(id) ON DELETE SET NULL;

COMMENT ON COLUMN applications.job_offer_id IS 'Offre d''origine si la candidature a été ajoutée depuis /offres. Le pipeline reste applications.status.';

CREATE INDEX IF NOT EXISTS idx_applications_job_offer_id ON applications (job_offer_id);

-- RLS
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offer_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offer_collection_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE job_offers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE job_offer_clicks FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE job_offer_collection_runs FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE job_offers TO authenticated;
GRANT SELECT, INSERT ON TABLE job_offer_clicks TO authenticated;

DROP POLICY IF EXISTS job_offers_select_authenticated ON job_offers;
CREATE POLICY job_offers_select_authenticated
  ON job_offers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS job_offer_clicks_select_own ON job_offer_clicks;
CREATE POLICY job_offer_clicks_select_own
  ON job_offer_clicks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS job_offer_clicks_insert_own ON job_offer_clicks;
CREATE POLICY job_offer_clicks_insert_own
  ON job_offer_clicks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Facettes des filtres (domaines, niveaux, sources) sur les offres actives uniquement.
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
        WHERE status = 'active' AND domain IS NOT NULL AND btrim(domain) <> ''
      ) q
    ), '[]'::json),
    'educationLevels', COALESCE((
      SELECT json_agg(d ORDER BY d)
      FROM (
        SELECT DISTINCT education_level AS d
        FROM public.job_offers
        WHERE status = 'active' AND education_level IS NOT NULL AND btrim(education_level) <> ''
      ) q
    ), '[]'::json),
    'sources', COALESCE((
      SELECT json_agg(d ORDER BY d)
      FROM (
        SELECT DISTINCT source AS d
        FROM public.job_offers
        WHERE status = 'active' AND btrim(source) <> ''
      ) q
    ), '[]'::json)
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_get_job_offer_stats()
RETURNS json
LANGUAGE plpgsql
STABLE
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
    'activeCount', (SELECT count(*)::int FROM public.job_offers WHERE status = 'active' AND is_demo = false),
    'demoCount', (SELECT count(*)::int FROM public.job_offers WHERE status = 'active' AND is_demo = true),
    'expiredCount', (SELECT count(*)::int FROM public.job_offers WHERE status = 'expired'),
    'clicksLast7Days', (
      SELECT count(*)::int FROM public.job_offer_clicks
      WHERE created_at >= (now() - interval '7 days')
    ),
    'sources', COALESCE((
      SELECT json_agg(json_build_object('source', source, 'activeCount', cnt) ORDER BY source)
      FROM (
        SELECT source, count(*)::int AS cnt
        FROM public.job_offers
        WHERE status = 'active'
        GROUP BY source
      ) s
    ), '[]'::json),
    'lastRun', (
      SELECT row_to_json(r)
      FROM (
        SELECT
          id,
          started_at,
          finished_at,
          status,
          sources,
          fetched_count,
          inserted_count,
          updated_count,
          duplicate_count,
          skipped_count,
          expired_count,
          error_message
        FROM public.job_offer_collection_runs
        ORDER BY started_at DESC
        LIMIT 1
      ) r
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.job_offer_facets() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_job_offer_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.job_offer_facets() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_job_offer_stats() TO authenticated, service_role;
