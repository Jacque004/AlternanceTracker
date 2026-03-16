-- Historique des lettres de motivation générées
CREATE TABLE IF NOT EXISTS generated_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Lettre de motivation',
  content TEXT NOT NULL,
  company_name VARCHAR(255),
  position VARCHAR(255),
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_letters_user_id ON generated_letters(user_id);

ALTER TABLE generated_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own letters" ON generated_letters;
CREATE POLICY "Users can view own letters" ON generated_letters FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own letters" ON generated_letters;
CREATE POLICY "Users can create own letters" ON generated_letters FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own letters" ON generated_letters;
CREATE POLICY "Users can update own letters" ON generated_letters FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own letters" ON generated_letters;
CREATE POLICY "Users can delete own letters" ON generated_letters FOR DELETE USING (auth.uid() = user_id);
