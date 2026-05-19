-- Notifications in-app (cloche dans l'interface)
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('welcome', 'application_created', 'weekly_followup')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  dedupe_key TEXT,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON user_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON user_notifications(user_id)
  WHERE read_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_dedupe
  ON user_notifications(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

COMMENT ON TABLE user_notifications IS 'Notifications affichées dans la cloche de l''application';

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON user_notifications;
CREATE POLICY "Users can insert own notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON user_notifications;
CREATE POLICY "Users can delete own notifications"
  ON user_notifications FOR DELETE
  USING (auth.uid() = user_id);
