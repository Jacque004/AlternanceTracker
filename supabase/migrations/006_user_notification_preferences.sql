-- Préférences de notifications (résumé hebdo, rappels)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS weekly_summary_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_emails_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN users.weekly_summary_enabled IS 'Recevoir un résumé hebdo par email';
COMMENT ON COLUMN users.reminder_emails_enabled IS 'Recevoir les rappels (relances, entretiens) par email';
