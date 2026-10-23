-- Alertes d'offres : une recherche enregistrée, un e-mail dès qu'une nouvelle offre correspond.
--
-- Lecture / écriture des alertes : l'utilisateur connecté, sur ses lignes seulement.
-- Journal d'envoi : lecture de ses propres envois. L'insertion est réservée au service role
-- (Edge Function send-job-alerts), pour qu'un client ne puisse pas marquer une offre comme déjà envoyée.
--
-- Planification (non exécutée ici) : même modèle que 007_cron_schedule_notifications.sql.
-- La collecte appelle déjà send-job-alerts après chaque nouvelle offre.
-- Un passage de secours toutes les 15 minutes couvre les imports lancés hors de cette fonction.
-- POST https://VOTRE_PROJECT_REF.supabase.co/functions/v1/send-job-alerts
-- Authorization: Bearer VOTRE_CRON_SECRET

CREATE TABLE IF NOT EXISTS public.job_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  keywords TEXT,
  location TEXT,
  domain TEXT,
  education_level TEXT,
  contract TEXT,
  remote TEXT,
  source TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT job_alerts_label_len CHECK (char_length(btrim(label)) BETWEEN 1 AND 120),
  CONSTRAINT job_alerts_keywords_len CHECK (keywords IS NULL OR char_length(keywords) <= 80),
  CONSTRAINT job_alerts_location_len CHECK (location IS NULL OR char_length(location) <= 80),
  CONSTRAINT job_alerts_domain_len CHECK (domain IS NULL OR char_length(domain) <= 120),
  CONSTRAINT job_alerts_education_len CHECK (education_level IS NULL OR char_length(education_level) <= 80),
  CONSTRAINT job_alerts_source_len CHECK (source IS NULL OR char_length(source) <= 80),
  CONSTRAINT job_alerts_contract_check CHECK (contract IS NULL OR contract IN ('stage', 'alternance')),
  CONSTRAINT job_alerts_remote_check CHECK (remote IS NULL OR remote IN ('yes', 'no')),
  CONSTRAINT job_alerts_has_criterion CHECK (
    COALESCE(btrim(keywords), '') <> ''
    OR COALESCE(btrim(location), '') <> ''
    OR COALESCE(btrim(domain), '') <> ''
    OR COALESCE(btrim(education_level), '') <> ''
    OR contract IS NOT NULL
    OR remote IS NOT NULL
    OR COALESCE(btrim(source), '') <> ''
  )
);

COMMENT ON TABLE public.job_alerts IS 'Recherches d''offres dont les nouveautés partent par e-mail.';
COMMENT ON COLUMN public.job_alerts.active IS 'Faux : l''alerte est en pause, aucun e-mail n''est envoyé.';

CREATE INDEX IF NOT EXISTS idx_job_alerts_user_created
  ON public.job_alerts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_alerts_active
  ON public.job_alerts (created_at)
  WHERE active = true;

CREATE UNIQUE INDEX IF NOT EXISTS job_alerts_user_criteria_key
  ON public.job_alerts (
    user_id,
    lower(COALESCE(keywords, '')),
    lower(COALESCE(location, '')),
    lower(COALESCE(domain, '')),
    lower(COALESCE(education_level, '')),
    lower(COALESCE(contract, '')),
    lower(COALESCE(remote, '')),
    lower(COALESCE(source, ''))
  );

DROP TRIGGER IF EXISTS update_job_alerts_updated_at ON public.job_alerts;
CREATE TRIGGER update_job_alerts_updated_at
  BEFORE UPDATE ON public.job_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;

CREATE OR REPLACE FUNCTION private.enforce_job_alert_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.job_alerts
    WHERE user_id = NEW.user_id
  ) >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 alertes atteinte'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS job_alerts_limit ON public.job_alerts;
CREATE TRIGGER job_alerts_limit
  BEFORE INSERT ON public.job_alerts
  FOR EACH ROW EXECUTE FUNCTION private.enforce_job_alert_limit();

CREATE TABLE IF NOT EXISTS public.job_alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.job_alerts(id) ON DELETE CASCADE,
  job_offer_id UUID NOT NULL REFERENCES public.job_offers(id) ON DELETE CASCADE,
  emailed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT job_alert_deliveries_alert_offer_key UNIQUE (alert_id, job_offer_id)
);

COMMENT ON TABLE public.job_alert_deliveries IS 'Offre déjà signalée pour une alerte. Empêche un second e-mail.';

CREATE INDEX IF NOT EXISTS idx_job_alert_deliveries_alert
  ON public.job_alert_deliveries (alert_id, emailed_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_offers_active_created
  ON public.job_offers (created_at DESC)
  WHERE status = 'active' AND is_demo = false;

ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_alert_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.job_alerts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.job_alert_deliveries FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_alerts TO authenticated;
GRANT SELECT ON TABLE public.job_alert_deliveries TO authenticated;

DROP POLICY IF EXISTS job_alerts_select_own ON public.job_alerts;
CREATE POLICY job_alerts_select_own
  ON public.job_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS job_alerts_insert_own ON public.job_alerts;
CREATE POLICY job_alerts_insert_own
  ON public.job_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS job_alerts_update_own ON public.job_alerts;
CREATE POLICY job_alerts_update_own
  ON public.job_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS job_alerts_delete_own ON public.job_alerts;
CREATE POLICY job_alerts_delete_own
  ON public.job_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS job_alert_deliveries_select_own ON public.job_alert_deliveries;
CREATE POLICY job_alert_deliveries_select_own
  ON public.job_alert_deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.job_alerts
      WHERE job_alerts.id = job_alert_deliveries.alert_id
        AND job_alerts.user_id = auth.uid()
    )
  );

DO $$
DECLARE
  constraint_name text;
BEGIN
  IF to_regclass('public.user_notifications') IS NULL THEN
    RETURN;
  END IF;

  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.user_notifications'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%welcome%'
  LOOP
    EXECUTE format('ALTER TABLE public.user_notifications DROP CONSTRAINT %I', constraint_name);
  END LOOP;

  ALTER TABLE public.user_notifications
    ADD CONSTRAINT user_notifications_type_check
    CHECK (type IN ('welcome', 'application_created', 'weekly_followup', 'job_alert'));
END $$;
