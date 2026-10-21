-- Étapes de la visite guidée, modifiables depuis le panneau admin.

CREATE TABLE IF NOT EXISTS public.onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER NOT NULL,
  step_key TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL,
  also_path TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  next_label TEXT NOT NULL,
  highlight TEXT NOT NULL,
  aside_path_prefix TEXT,
  aside_title TEXT,
  aside_body TEXT,
  aside_back_label TEXT,
  CONSTRAINT onboarding_steps_path_check CHECK (path LIKE '/%'),
  CONSTRAINT onboarding_steps_title_check CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT onboarding_steps_body_check CHECK (char_length(body) BETWEEN 1 AND 600),
  CONSTRAINT onboarding_steps_next_label_check CHECK (char_length(next_label) BETWEEN 1 AND 40),
  CONSTRAINT onboarding_steps_highlight_check CHECK (char_length(highlight) BETWEEN 1 AND 80)
);

COMMENT ON TABLE public.onboarding_steps IS 'Parcours de la visite guidée, édité par les administrateurs';

ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_steps_select" ON public.onboarding_steps;
CREATE POLICY "onboarding_steps_select"
  ON public.onboarding_steps FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "onboarding_steps_insert" ON public.onboarding_steps;
CREATE POLICY "onboarding_steps_insert"
  ON public.onboarding_steps FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "onboarding_steps_update" ON public.onboarding_steps;
CREATE POLICY "onboarding_steps_update"
  ON public.onboarding_steps FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "onboarding_steps_delete" ON public.onboarding_steps;
CREATE POLICY "onboarding_steps_delete"
  ON public.onboarding_steps FOR DELETE
  TO authenticated
  USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_steps TO authenticated;

INSERT INTO public.onboarding_steps (
  position, step_key, path, also_path, title, body, next_label, highlight,
  aside_path_prefix, aside_title, aside_body, aside_back_label
)
VALUES
  (0, 'accueil', '/', NULL, 'Cette semaine',
   'Les candidatures, les relances et les entretiens à venir sont ici. Les quatre cartes mènent aux autres pages.',
   'Offres', 'home-shortcuts', NULL, NULL, NULL, NULL),
  (1, 'offres', '/offres', NULL, 'Les annonces',
   'La liste tient compte de votre ville et de votre domaine, s’ils sont dans le profil. Ouvrez une offre pour la ranger dans vos candidatures.',
   'Candidatures', 'offers-search', '/offres/', 'Cette offre',
   '« Ajouter à mes candidatures » crée le dossier. « Voir l’offre originale » ouvre l’annonce.',
   'Liste des offres'),
  (2, 'candidatures', '/applications', NULL, 'Vos dossiers',
   'Chaque carte avance d’une étape à l’autre, de « À postuler » jusqu’au refus. Une date d’entretien saisie sur la fiche se retrouve dans le calendrier.',
   'Calendrier', 'applications-views', '/applications/', 'La fiche',
   'Statut, contact, relance, date et lieu d’entretien. Enregistrez avant de partir.',
   'Toutes les candidatures'),
  (3, 'calendrier', '/calendar', NULL, 'Entretiens et relances',
   'Le mois reprend les dates déjà notées sur les fiches. Le bandeau vert, lui, prépare le rythme à envoyer à une entreprise.',
   'Préparer', 'calendar-rhythm', NULL, NULL, NULL, NULL),
  (4, 'cv', '/preparer/cv', '/preparer', 'Mon CV',
   'Les sections se remplissent ici, ou à partir d’un PDF. L’autre onglet de cette page donne une analyse pour l’alternance.',
   'Lettres', 'preparer-cv', NULL, NULL, NULL, NULL),
  (5, 'lettres', '/preparer/lettres', NULL, 'La lettre',
   'Un modèle selon le type d’entreprise, ou un texte généré depuis une candidature déjà créée.',
   'Analyser une offre', 'preparer-lettres', NULL, NULL, NULL, NULL),
  (6, 'analyser', '/preparer/analyser-offre', NULL, 'Analyser une offre',
   'Collez le lien, ou le texte de l’annonce. Ça indique quoi mettre en avant dans le CV et la lettre.',
   'Conseils', 'preparer-analyser', NULL, NULL, NULL, NULL),
  (7, 'conseils', '/preparer/conseils', NULL, 'Conseils',
   'CV, recherche, entretien, relances. L’onglet s’appelle Conseils, la page s’intitule « Coaching alternance ».',
   'Rythme', 'preparer-conseils', NULL, NULL, NULL, NULL),
  (8, 'rythme', '/rythme', NULL, 'Jours d’école, jours d’entreprise',
   'La zone de vacances et le rythme dessinent le contrat. Le lien en bas s’ouvre sans compte. Pour revenir : la carte Rythme, sur l’accueil.',
   'Mon espace', 'rhythm-settings', NULL, NULL, NULL, NULL),
  (9, 'profil', '/profile', NULL, 'Mon espace',
   'École, ville et objectif de la semaine servent aux offres et à l’accueil. Les e-mails et la cloche se règlent plus bas, dans Notifications.',
   'Fermer', 'nav-profile', NULL, NULL, NULL, NULL)
ON CONFLICT (step_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_save_onboarding_steps(p_steps jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  idx integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : droits administrateur requis'
      USING ERRCODE = '42501';
  END IF;

  IF p_steps IS NULL OR jsonb_typeof(p_steps) <> 'array' THEN
    RAISE EXCEPTION 'La visite doit être une liste d’étapes';
  END IF;

  IF jsonb_array_length(p_steps) > 30 THEN
    RAISE EXCEPTION '30 étapes au maximum';
  END IF;

  DELETE FROM public.onboarding_steps;

  FOR item IN SELECT value FROM jsonb_array_elements(p_steps)
  LOOP
    IF coalesce(item->>'path', '') NOT LIKE '/%'
      OR char_length(coalesce(item->>'title', '')) NOT BETWEEN 1 AND 120
      OR char_length(coalesce(item->>'body', '')) NOT BETWEEN 1 AND 600
      OR char_length(coalesce(item->>'next_label', '')) NOT BETWEEN 1 AND 40
      OR char_length(coalesce(item->>'highlight', '')) NOT BETWEEN 1 AND 80
      OR char_length(coalesce(item->>'step_key', '')) NOT BETWEEN 1 AND 80
    THEN
      RAISE EXCEPTION 'Une étape est incomplète ou trop longue';
    END IF;

    INSERT INTO public.onboarding_steps (
      position, step_key, path, also_path, title, body, next_label, highlight,
      aside_path_prefix, aside_title, aside_body, aside_back_label
    )
    VALUES (
      idx,
      item->>'step_key',
      item->>'path',
      NULLIF(item->>'also_path', ''),
      item->>'title',
      item->>'body',
      item->>'next_label',
      item->>'highlight',
      NULLIF(item->>'aside_path_prefix', ''),
      NULLIF(item->>'aside_title', ''),
      NULLIF(item->>'aside_body', ''),
      NULLIF(item->>'aside_back_label', '')
    );
    idx := idx + 1;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_onboarding_steps(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_onboarding_steps(jsonb) TO authenticated;
