-- Préférence : notifications in-app (cloche)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS in_app_notifications_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN users.in_app_notifications_enabled IS 'Recevoir les notifications dans l''application (icône cloche)';
