-- Exécuter dans Supabase → SQL Editor (New query → Run)

CREATE TABLE IF NOT EXISTS interview_preps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  cv_talking_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_preps_user ON interview_preps(user_id);

ALTER TABLE interview_preps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own interview preps" ON interview_preps;
CREATE POLICY "Users can view own interview preps"
  ON interview_preps FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own interview preps" ON interview_preps;
CREATE POLICY "Users can insert own interview preps"
  ON interview_preps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own interview preps" ON interview_preps;
CREATE POLICY "Users can update own interview preps"
  ON interview_preps FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own interview preps" ON interview_preps;
CREATE POLICY "Users can delete own interview preps"
  ON interview_preps FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE interview_preps TO authenticated;
GRANT ALL ON TABLE interview_preps TO service_role;
