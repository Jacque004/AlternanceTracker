-- Offres fictives pour rendre /offres utilisable avant une collecte réelle.
-- Source mock-dev, is_demo = true. ON CONFLICT : rejouable sans doublon.
-- Les utilisateurs authentifiés peuvent relancer ce jeu fixe. Ils ne peuvent pas y passer une offre arbitraire.

CREATE OR REPLACE FUNCTION public.seed_demo_job_offers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.job_offers (
    title, company_name, location, contract_type, education_level, domain, salary, remote,
    description, source, source_url, external_id, published_at, status, is_demo, fingerprint
  )
  SELECT
    v.title,
    v.company_name,
    v.location,
    'Alternance',
    v.education_level,
    v.domain,
    v.salary,
    v.remote,
    'Offre fictive générée pour le développement. Elle ne correspond à aucune annonce réelle et ne doit pas être utilisée en production.',
    'mock-dev',
    'https://example.com/alternancetracker-demo/offre/' || v.external_id,
    v.external_id,
    ((now() - v.age)::date + time '08:00') AT TIME ZONE 'UTC',
    'active',
    true,
    lower(v.company_name) || '|' || lower(v.title) || '|' || lower(v.location)
  FROM (
    VALUES
      ('[Démo] Développeur Full Stack', 'Atelier Numérique', 'Paris', 'Bac+3', 'Informatique', '1 200 € / mois'::text, true, 'mock-1', interval '1 day'),
      ('[Démo] Développeuse web', 'Studio Loire', 'Nantes', 'Bac+2', 'Informatique', NULL::text, false, 'mock-2', interval '2 days'),
      ('[Démo] Technicien support', 'Hexa Services', 'Lyon', 'Bac', 'Informatique', '980 € / mois', false, 'mock-3', interval '3 days'),
      ('[Démo] Chargé de marketing digital', 'Agence Claire', 'Lille', 'Bac+3', 'Marketing', NULL, true, 'mock-4', interval '4 days'),
      ('[Démo] Assistant commercial', 'Nord Distribution', 'Lille', 'Bac+2', 'Commerce', NULL, false, 'mock-5', interval '5 days'),
      ('[Démo] Concepteur UI', 'Atelier Numérique', 'Paris', 'Bac+3', 'Informatique', '1 100 € / mois', true, 'mock-6', interval '6 days'),
      ('[Démo] Analyste données', 'Mesure & Co', 'Toulouse', 'Bac+5', 'Informatique', NULL, true, 'mock-7', interval '8 days'),
      ('[Démo] Gestionnaire de paie', 'Cabinet Hélios', 'Rennes', 'Bac+2', 'Gestion', NULL, false, 'mock-8', interval '9 days'),
      ('[Démo] Technicien de maintenance', 'Ateliers Durand', 'Saint-Étienne', 'Bac', 'Industrie', '1 050 € / mois', false, 'mock-9', interval '10 days'),
      ('[Démo] Community manager', 'Agence Claire', 'Lille', 'Bac+3', 'Marketing', NULL, true, 'mock-10', interval '12 days'),
      ('[Démo] Développeur mobile', 'Studio Loire', 'Nantes', 'Bac+3', 'Informatique', NULL, false, 'mock-11', interval '14 days'),
      ('[Démo] Assistant RH', 'Cabinet Hélios', 'Rennes', 'Bac+3', 'Gestion', NULL, false, 'mock-12', interval '15 days'),
      ('[Démo] Vendeur conseil', 'Nord Distribution', 'Amiens', 'Bac', 'Commerce', NULL, false, 'mock-13', interval '18 days'),
      ('[Démo] Intégrateur web', 'Hexa Services', 'Lyon', 'Bac+2', 'Informatique', NULL, true, 'mock-14', interval '20 days'),
      ('[Démo] Chargé de logistique', 'Ateliers Durand', 'Saint-Étienne', 'Bac+2', 'Industrie', NULL, false, 'mock-15', interval '21 days'),
      ('[Démo] Assistant comptable', 'Cabinet Hélios', 'Rennes', 'Bac+2', 'Gestion', '1 000 € / mois', false, 'mock-16', interval '22 days'),
      ('[Démo] Data analyst junior', 'Mesure & Co', 'Toulouse', 'Bac+5', 'Informatique', NULL, true, 'mock-17', interval '25 days'),
      ('[Démo] Graphiste', 'Agence Claire', 'Paris', 'Bac+2', 'Marketing', NULL, false, 'mock-18', interval '28 days'),
      ('[Démo] Développeur backend', 'Atelier Numérique', 'Paris', 'Bac+5', 'Informatique', '1 350 € / mois', true, 'mock-19', interval '30 days'),
      ('[Démo] Préparateur de commandes', 'Nord Distribution', 'Lille', 'Bac', 'Commerce', NULL, false, 'mock-20', interval '33 days'),
      ('[Démo] Automaticien', 'Ateliers Durand', 'Lyon', 'Bac+2', 'Industrie', NULL, false, 'mock-21', interval '35 days'),
      ('[Démo] Chargé de communication', 'Studio Loire', 'Nantes', 'Bac+3', 'Marketing', NULL, true, 'mock-22', interval '40 days')
  ) AS v(title, company_name, location, education_level, domain, salary, remote, external_id, age)
  ON CONFLICT ON CONSTRAINT job_offers_dedupe_key_key DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_demo_job_offers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_demo_job_offers() TO authenticated, service_role;

-- Même jeu, appliqué tout de suite par la migration (sans session utilisateur).
INSERT INTO public.job_offers (
  title, company_name, location, contract_type, education_level, domain, salary, remote,
  description, source, source_url, external_id, published_at, status, is_demo, fingerprint
)
SELECT
  v.title,
  v.company_name,
  v.location,
  'Alternance',
  v.education_level,
  v.domain,
  v.salary,
  v.remote,
  'Offre fictive générée pour le développement. Elle ne correspond à aucune annonce réelle et ne doit pas être utilisée en production.',
  'mock-dev',
  'https://example.com/alternancetracker-demo/offre/' || v.external_id,
  v.external_id,
  ((now() - v.age)::date + time '08:00') AT TIME ZONE 'UTC',
  'active',
  true,
  lower(v.company_name) || '|' || lower(v.title) || '|' || lower(v.location)
FROM (
  VALUES
    ('[Démo] Développeur Full Stack', 'Atelier Numérique', 'Paris', 'Bac+3', 'Informatique', '1 200 € / mois'::text, true, 'mock-1', interval '1 day'),
    ('[Démo] Développeuse web', 'Studio Loire', 'Nantes', 'Bac+2', 'Informatique', NULL::text, false, 'mock-2', interval '2 days'),
    ('[Démo] Technicien support', 'Hexa Services', 'Lyon', 'Bac', 'Informatique', '980 € / mois', false, 'mock-3', interval '3 days'),
    ('[Démo] Chargé de marketing digital', 'Agence Claire', 'Lille', 'Bac+3', 'Marketing', NULL, true, 'mock-4', interval '4 days'),
    ('[Démo] Assistant commercial', 'Nord Distribution', 'Lille', 'Bac+2', 'Commerce', NULL, false, 'mock-5', interval '5 days'),
    ('[Démo] Concepteur UI', 'Atelier Numérique', 'Paris', 'Bac+3', 'Informatique', '1 100 € / mois', true, 'mock-6', interval '6 days'),
    ('[Démo] Analyste données', 'Mesure & Co', 'Toulouse', 'Bac+5', 'Informatique', NULL, true, 'mock-7', interval '8 days'),
    ('[Démo] Gestionnaire de paie', 'Cabinet Hélios', 'Rennes', 'Bac+2', 'Gestion', NULL, false, 'mock-8', interval '9 days'),
    ('[Démo] Technicien de maintenance', 'Ateliers Durand', 'Saint-Étienne', 'Bac', 'Industrie', '1 050 € / mois', false, 'mock-9', interval '10 days'),
    ('[Démo] Community manager', 'Agence Claire', 'Lille', 'Bac+3', 'Marketing', NULL, true, 'mock-10', interval '12 days'),
    ('[Démo] Développeur mobile', 'Studio Loire', 'Nantes', 'Bac+3', 'Informatique', NULL, false, 'mock-11', interval '14 days'),
    ('[Démo] Assistant RH', 'Cabinet Hélios', 'Rennes', 'Bac+3', 'Gestion', NULL, false, 'mock-12', interval '15 days'),
    ('[Démo] Vendeur conseil', 'Nord Distribution', 'Amiens', 'Bac', 'Commerce', NULL, false, 'mock-13', interval '18 days'),
    ('[Démo] Intégrateur web', 'Hexa Services', 'Lyon', 'Bac+2', 'Informatique', NULL, true, 'mock-14', interval '20 days'),
    ('[Démo] Chargé de logistique', 'Ateliers Durand', 'Saint-Étienne', 'Bac+2', 'Industrie', NULL, false, 'mock-15', interval '21 days'),
    ('[Démo] Assistant comptable', 'Cabinet Hélios', 'Rennes', 'Bac+2', 'Gestion', '1 000 € / mois', false, 'mock-16', interval '22 days'),
    ('[Démo] Data analyst junior', 'Mesure & Co', 'Toulouse', 'Bac+5', 'Informatique', NULL, true, 'mock-17', interval '25 days'),
    ('[Démo] Graphiste', 'Agence Claire', 'Paris', 'Bac+2', 'Marketing', NULL, false, 'mock-18', interval '28 days'),
    ('[Démo] Développeur backend', 'Atelier Numérique', 'Paris', 'Bac+5', 'Informatique', '1 350 € / mois', true, 'mock-19', interval '30 days'),
    ('[Démo] Préparateur de commandes', 'Nord Distribution', 'Lille', 'Bac', 'Commerce', NULL, false, 'mock-20', interval '33 days'),
    ('[Démo] Automaticien', 'Ateliers Durand', 'Lyon', 'Bac+2', 'Industrie', NULL, false, 'mock-21', interval '35 days'),
    ('[Démo] Chargé de communication', 'Studio Loire', 'Nantes', 'Bac+3', 'Marketing', NULL, true, 'mock-22', interval '40 days')
) AS v(title, company_name, location, education_level, domain, salary, remote, external_id, age)
ON CONFLICT ON CONSTRAINT job_offers_dedupe_key_key DO NOTHING;
