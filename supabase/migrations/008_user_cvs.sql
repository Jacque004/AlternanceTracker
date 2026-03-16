-- Table pour stocker les CV des utilisateurs (structure ATS-friendly)
CREATE TABLE IF NOT EXISTS user_cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Mon CV',
  -- Contenu structuré par sections (titres standard pour ATS)
  content JSONB NOT NULL DEFAULT '{}',
  ats_score INTEGER CHECK (ats_score >= 0 AND ats_score <= 100),
  ats_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_cvs_user_id ON user_cvs(user_id);

DROP TRIGGER IF EXISTS update_user_cvs_updated_at ON user_cvs;
CREATE TRIGGER update_user_cvs_updated_at
  BEFORE UPDATE ON user_cvs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_cvs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own CVs" ON user_cvs;
CREATE POLICY "Users can view own CVs"
  ON user_cvs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own CVs" ON user_cvs;
CREATE POLICY "Users can create own CVs"
  ON user_cvs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own CVs" ON user_cvs;
CREATE POLICY "Users can update own CVs"
  ON user_cvs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own CVs" ON user_cvs;
CREATE POLICY "Users can delete own CVs"
  ON user_cvs FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE user_cvs IS 'CV utilisateur : contenu JSON par sections (coordonnees, experience, formation, etc.) pour édition et export ATS';
