-- Profil étudiant enrichi : champs optionnels pour les utilisateurs
ALTER TABLE users ADD COLUMN IF NOT EXISTS school VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS formation VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS study_year VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS alternance_rhythm VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS desired_start_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

COMMENT ON COLUMN users.school IS 'École ou établissement';
COMMENT ON COLUMN users.formation IS 'Intitulé de la formation';
COMMENT ON COLUMN users.study_year IS 'Année (ex: L2, M1)';
COMMENT ON COLUMN users.alternance_rhythm IS 'Rythme alternance (ex: 2j école / 3j entreprise)';
COMMENT ON COLUMN users.desired_start_date IS 'Date de début d''alternance recherchée';
COMMENT ON COLUMN users.linkedin_url IS 'Profil LinkedIn';
