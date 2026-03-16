-- Objectif de candidatures (hebdo ou mensuel) pour le dashboard
ALTER TABLE users ADD COLUMN IF NOT EXISTS applications_goal INTEGER CHECK (applications_goal IS NULL OR applications_goal > 0);
COMMENT ON COLUMN users.applications_goal IS 'Objectif nombre de candidatures par semaine (affiché sur le dashboard)';
