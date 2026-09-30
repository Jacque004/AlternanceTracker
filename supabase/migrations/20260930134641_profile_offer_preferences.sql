-- Préférences utilisées pour ouvrir /offres déjà filtrée.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_location varchar(120),
  ADD COLUMN IF NOT EXISTS preferred_domain varchar(120),
  ADD COLUMN IF NOT EXISTS preferred_education_level varchar(80);

COMMENT ON COLUMN public.users.preferred_location IS 'Ville recherchée pour le catalogue d''offres';
COMMENT ON COLUMN public.users.preferred_domain IS 'Domaine d''offres, aligné sur les filtres du catalogue';
COMMENT ON COLUMN public.users.preferred_education_level IS 'Niveau d''études recherché, aligné sur les filtres du catalogue';
