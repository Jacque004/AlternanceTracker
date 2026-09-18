-- Pipeline Kanban : À postuler → Envoyée → Relancée → Entretien → Offre / Refus
-- + journal des changements (statut, relance, entretien déplacé)

-- Candidatures déjà relancées : colonne Relancée
UPDATE applications
SET status = 'followed_up'
WHERE status = 'pending'
  AND last_relance_at IS NOT NULL;

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'to_apply',
    'pending',
    'followed_up',
    'interview',
    'accepted',
    'rejected'
  ));

CREATE TABLE IF NOT EXISTS application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('created', 'status_change', 'relance', 'interview_changed')
  ),
  from_status TEXT,
  to_status TEXT,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_events_app_created
  ON application_events(application_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_application_events_user_created
  ON application_events(user_id, created_at DESC);

COMMENT ON TABLE application_events IS 'Journal des candidatures : création, statuts, relances, entretiens';

ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own application events" ON application_events;
CREATE POLICY "Users can view own application events"
  ON application_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION application_status_label(s TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE s
    WHEN 'to_apply' THEN 'À postuler'
    WHEN 'pending' THEN 'Envoyée'
    WHEN 'followed_up' THEN 'Relancée'
    WHEN 'interview' THEN 'Entretien'
    WHEN 'accepted' THEN 'Offre'
    WHEN 'rejected' THEN 'Refus'
    ELSE COALESCE(s, '')
  END;
$$;

-- Dates / relance automatiques lors d’un changement de colonne Kanban
CREATE OR REPLACE FUNCTION applications_pipeline_side_effects()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'followed_up'
     AND OLD.status IS DISTINCT FROM 'followed_up'
     AND NEW.last_relance_at IS NOT DISTINCT FROM OLD.last_relance_at THEN
    NEW.last_relance_at := NOW();
  END IF;

  IF NEW.status = 'pending'
     AND OLD.status = 'to_apply'
     AND NEW.application_date IS NULL THEN
    NEW.application_date := CURRENT_DATE;
  END IF;

  IF NEW.status IN ('accepted', 'rejected')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.response_date IS NULL THEN
    NEW.response_date := CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_pipeline_side_effects ON applications;
CREATE TRIGGER applications_pipeline_side_effects
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION applications_pipeline_side_effects();

CREATE OR REPLACE FUNCTION log_application_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  summary TEXT;
  skip_interview_log BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO application_events (
      application_id, user_id, event_type, from_status, to_status, summary, metadata, created_at
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'created',
      NULL,
      NEW.status,
      'Candidature créée · ' || application_status_label(NEW.status),
      jsonb_build_object('status', NEW.status),
      COALESCE(NEW.created_at, NOW())
    );
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'followed_up' THEN
      summary := 'Relancé le ' || to_char(NOW() AT TIME ZONE 'Europe/Paris', 'DD/MM');
    ELSIF NEW.status = 'pending' THEN
      summary := 'Envoyée le ' || to_char(COALESCE(NEW.application_date, CURRENT_DATE), 'DD/MM');
    ELSIF NEW.status = 'interview' THEN
      IF NEW.interview_date IS NOT NULL THEN
        summary := 'Entretien prévu le ' || to_char(NEW.interview_date, 'DD/MM');
        skip_interview_log := TRUE;
      ELSE
        summary := 'Passé en entretien';
      END IF;
    ELSIF NEW.status = 'accepted' THEN
      summary := 'Offre le ' || to_char(COALESCE(NEW.response_date, CURRENT_DATE), 'DD/MM');
    ELSIF NEW.status = 'rejected' THEN
      summary := 'Refus le ' || to_char(COALESCE(NEW.response_date, CURRENT_DATE), 'DD/MM');
    ELSIF NEW.status = 'to_apply' THEN
      summary := 'Remis dans À postuler';
    ELSE
      summary := application_status_label(OLD.status) || ' → ' || application_status_label(NEW.status);
    END IF;

    INSERT INTO application_events (
      application_id, user_id, event_type, from_status, to_status, summary, metadata
    ) VALUES (
      NEW.id,
      NEW.user_id,
      CASE WHEN NEW.status = 'followed_up' THEN 'relance' ELSE 'status_change' END,
      OLD.status,
      NEW.status,
      summary,
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  ELSIF NEW.last_relance_at IS DISTINCT FROM OLD.last_relance_at THEN
    INSERT INTO application_events (
      application_id, user_id, event_type, from_status, to_status, summary, metadata
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'relance',
      OLD.status,
      NEW.status,
      'Relancé le ' || to_char(NOW() AT TIME ZONE 'Europe/Paris', 'DD/MM'),
      jsonb_build_object('last_relance_at', NEW.last_relance_at)
    );
  END IF;

  IF NOT skip_interview_log
     AND (
       NEW.interview_date IS DISTINCT FROM OLD.interview_date
       OR NEW.interview_time IS DISTINCT FROM OLD.interview_time
       OR NEW.interview_place IS DISTINCT FROM OLD.interview_place
     ) THEN
    IF OLD.interview_date IS NOT NULL
       AND NEW.interview_date IS DISTINCT FROM OLD.interview_date THEN
      summary := 'Entretien déplacé du '
        || to_char(OLD.interview_date, 'DD/MM')
        || ' au '
        || COALESCE(to_char(NEW.interview_date, 'DD/MM'), '—');
    ELSIF OLD.interview_date IS NULL AND NEW.interview_date IS NOT NULL THEN
      summary := 'Entretien prévu le ' || to_char(NEW.interview_date, 'DD/MM');
    ELSIF NEW.interview_time IS DISTINCT FROM OLD.interview_time THEN
      summary := 'Heure d''entretien mise à jour';
    ELSIF NEW.interview_place IS DISTINCT FROM OLD.interview_place THEN
      summary := 'Lieu d''entretien mis à jour';
    ELSE
      summary := 'Entretien mis à jour';
    END IF;

    INSERT INTO application_events (
      application_id, user_id, event_type, from_status, to_status, summary, metadata
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'interview_changed',
      OLD.status,
      NEW.status,
      summary,
      jsonb_build_object(
        'from_date', OLD.interview_date,
        'to_date', NEW.interview_date,
        'from_time', OLD.interview_time,
        'to_time', NEW.interview_time
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_log_events_insert ON applications;
CREATE TRIGGER applications_log_events_insert
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION log_application_events();

DROP TRIGGER IF EXISTS applications_log_events_update ON applications;
CREATE TRIGGER applications_log_events_update
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION log_application_events();

-- Journal de départ pour les candidatures déjà présentes
INSERT INTO application_events (
  application_id, user_id, event_type, to_status, summary, metadata, created_at
)
SELECT
  id,
  user_id,
  'created',
  status,
  'Candidature créée · ' || application_status_label(status),
  jsonb_build_object('status', status, 'backfill', true),
  created_at
FROM applications
WHERE NOT EXISTS (
  SELECT 1 FROM application_events e WHERE e.application_id = applications.id
);

INSERT INTO application_events (
  application_id, user_id, event_type, from_status, to_status, summary, metadata, created_at
)
SELECT
  id,
  user_id,
  'relance',
  'pending',
  'followed_up',
  'Relancé le ' || to_char(last_relance_at AT TIME ZONE 'Europe/Paris', 'DD/MM'),
  jsonb_build_object('last_relance_at', last_relance_at, 'backfill', true),
  last_relance_at
FROM applications
WHERE last_relance_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM application_events e
    WHERE e.application_id = applications.id
      AND e.event_type = 'relance'
  );

GRANT SELECT ON TABLE application_events TO authenticated;
GRANT ALL ON TABLE application_events TO service_role;
