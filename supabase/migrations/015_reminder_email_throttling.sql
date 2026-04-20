-- Anti-spam des emails de rappel:
-- - relance_reminder_sent_at: évite d'envoyer la même relance à chaque exécution du cron.
-- - interview_day_reminder_sent_at: évite de renvoyer le rappel "aujourd'hui/demain" trop souvent.
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS relance_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS interview_day_reminder_sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_applications_relance_reminder_sent_at
  ON applications(relance_reminder_sent_at)
  WHERE relance_reminder_sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applications_interview_day_reminder_sent_at
  ON applications(interview_day_reminder_sent_at)
  WHERE interview_day_reminder_sent_at IS NOT NULL;
