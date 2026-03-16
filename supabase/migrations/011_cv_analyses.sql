-- Historique des analyses CV (alternance et ATS)
CREATE TABLE IF NOT EXISTS cv_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_cv_id UUID REFERENCES user_cvs(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('alternance', 'ats')),
  result_text TEXT,
  result_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_analyses_user_id ON cv_analyses(user_id);

ALTER TABLE cv_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cv_analyses" ON cv_analyses;
CREATE POLICY "Users can view own cv_analyses" ON cv_analyses FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own cv_analyses" ON cv_analyses;
CREATE POLICY "Users can create own cv_analyses" ON cv_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cv_analyses" ON cv_analyses;
CREATE POLICY "Users can delete own cv_analyses" ON cv_analyses FOR DELETE USING (auth.uid() = user_id);
