-- Anti-doublon des rappels d'entretien imminents (J-30 min / J-5 min)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS interview_reminder_30_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS interview_reminder_5_sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_applications_interview_reminder_30_sent_at
  ON applications(interview_reminder_30_sent_at)
  WHERE interview_reminder_30_sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applications_interview_reminder_5_sent_at
  ON applications(interview_reminder_5_sent_at)
  WHERE interview_reminder_5_sent_at IS NOT NULL;
