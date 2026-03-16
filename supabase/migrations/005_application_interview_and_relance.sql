-- Champs pour le statut Entretien : date, heure, lieu
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS interview_date DATE,
  ADD COLUMN IF NOT EXISTS interview_time TIME,
  ADD COLUMN IF NOT EXISTS interview_place VARCHAR(500);

-- Date de dernière relance (pour "Marquer relancé" et exclure des rappels 7 jours)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS last_relance_at TIMESTAMP WITH TIME ZONE;

-- Index pour filtrer/trier par date d'entretien et relances
CREATE INDEX IF NOT EXISTS idx_applications_interview_date ON applications(interview_date) WHERE interview_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_last_relance_at ON applications(last_relance_at) WHERE last_relance_at IS NOT NULL;
