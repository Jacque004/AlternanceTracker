export type OnboardingAside = {
  pathPrefix: string;
  title: string;
  text: string;
  backLabel: string;
};

/** Contenu d’une étape, tel qu’il est enregistré et édité. */
export type OnboardingStepInput = {
  id: string;
  path: string;
  /** Seconde page qui affiche la même étape, par exemple /preparer pour le CV. */
  alsoPath?: string;
  title: string;
  text: string;
  nextLabel: string;
  highlight: string;
  aside?: OnboardingAside | null;
};

export type OnboardingRuntimeStep = {
  id: string;
  path: string;
  match: (path: string) => boolean;
  title: string;
  text: string;
  nextLabel: string;
  highlight: string;
  aside?: {
    match: (path: string) => boolean;
    title: string;
    text: string;
    backLabel: string;
  };
};

export const ONBOARDING_HIGHLIGHTS = [
  'home-shortcuts',
  'offers-search',
  'applications-views',
  'calendar-rhythm',
  'preparer-cv',
  'preparer-lettres',
  'preparer-analyser',
  'preparer-conseils',
  'rhythm-settings',
  'nav-home',
  'nav-applications',
  'nav-offers',
  'nav-calendar',
  'nav-preparer',
  'nav-profile',
];

export const DEFAULT_ONBOARDING_STEPS: OnboardingStepInput[] = [
  {
    id: 'accueil',
    path: '/',
    title: 'Cette semaine',
    text: 'Les candidatures, les relances et les entretiens à venir sont ici. Les quatre cartes mènent aux autres pages.',
    nextLabel: 'Offres',
    highlight: 'home-shortcuts',
  },
  {
    id: 'offres',
    path: '/offres',
    title: 'Les annonces',
    text: 'La liste tient compte de votre ville et de votre domaine, s’ils sont dans le profil. Ouvrez une offre pour la ranger dans vos candidatures.',
    nextLabel: 'Candidatures',
    highlight: 'offers-search',
    aside: {
      pathPrefix: '/offres/',
      title: 'Cette offre',
      text: '« Ajouter à mes candidatures » crée le dossier. « Voir l’offre originale » ouvre l’annonce.',
      backLabel: 'Liste des offres',
    },
  },
  {
    id: 'candidatures',
    path: '/applications',
    title: 'Vos dossiers',
    text: 'Chaque carte avance d’une étape à l’autre, de « À postuler » jusqu’au refus. Une date d’entretien saisie sur la fiche se retrouve dans le calendrier.',
    nextLabel: 'Calendrier',
    highlight: 'applications-views',
    aside: {
      pathPrefix: '/applications/',
      title: 'La fiche',
      text: 'Statut, contact, relance, date et lieu d’entretien. Enregistrez avant de partir.',
      backLabel: 'Toutes les candidatures',
    },
  },
  {
    id: 'calendrier',
    path: '/calendar',
    title: 'Entretiens et relances',
    text: 'Le mois reprend les dates déjà notées sur les fiches. Le bandeau vert, lui, prépare le rythme à envoyer à une entreprise.',
    nextLabel: 'Préparer',
    highlight: 'calendar-rhythm',
  },
  {
    id: 'cv',
    path: '/preparer/cv',
    alsoPath: '/preparer',
    title: 'Mon CV',
    text: 'Les sections se remplissent ici, ou à partir d’un PDF. L’autre onglet de cette page donne une analyse pour l’alternance.',
    nextLabel: 'Lettres',
    highlight: 'preparer-cv',
  },
  {
    id: 'lettres',
    path: '/preparer/lettres',
    title: 'La lettre',
    text: 'Un modèle selon le type d’entreprise, ou un texte généré depuis une candidature déjà créée.',
    nextLabel: 'Analyser une offre',
    highlight: 'preparer-lettres',
  },
  {
    id: 'analyser',
    path: '/preparer/analyser-offre',
    title: 'Analyser une offre',
    text: 'Collez le lien, ou le texte de l’annonce. Ça indique quoi mettre en avant dans le CV et la lettre.',
    nextLabel: 'Conseils',
    highlight: 'preparer-analyser',
  },
  {
    id: 'conseils',
    path: '/preparer/conseils',
    title: 'Conseils',
    text: 'CV, recherche, entretien, relances. L’onglet s’appelle Conseils, la page s’intitule « Coaching alternance ».',
    nextLabel: 'Rythme',
    highlight: 'preparer-conseils',
  },
  {
    id: 'rythme',
    path: '/rythme',
    title: 'Jours d’école, jours d’entreprise',
    text: 'La zone de vacances et le rythme dessinent le contrat. Le lien en bas s’ouvre sans compte. Pour revenir : la carte Rythme, sur l’accueil.',
    nextLabel: 'Mon espace',
    highlight: 'rhythm-settings',
  },
  {
    id: 'profil',
    path: '/profile',
    title: 'Mon espace',
    text: 'École, ville et objectif de la semaine servent aux offres et à l’accueil. Les e-mails et la cloche se règlent plus bas, dans Notifications.',
    nextLabel: 'Fermer',
    highlight: 'nav-profile',
  },
];

export function normalizeOnboardingPath(path: string): string {
  return path.replace(/\/+$/, '') || '/';
}

export function cloneOnboardingSteps(steps: OnboardingStepInput[]): OnboardingStepInput[] {
  return steps.map((step) => ({
    ...step,
    aside: step.aside ? { ...step.aside } : null,
  }));
}

export function createOnboardingStep(): OnboardingStepInput {
  return {
    id: crypto.randomUUID(),
    path: '/',
    title: 'Nouvelle étape',
    text: '',
    nextLabel: 'Suivant',
    highlight: 'home-shortcuts',
    aside: null,
  };
}

export function moveOnboardingStep(
  steps: OnboardingStepInput[],
  index: number,
  direction: -1 | 1
): OnboardingStepInput[] {
  const target = index + direction;
  if (target < 0 || target >= steps.length) return steps;
  const next = steps.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function onboardingStepError(step: OnboardingStepInput): string | null {
  if (!step.title.trim()) return 'Le titre est obligatoire.';
  if (!step.text.trim()) return 'Le texte est obligatoire.';
  if (!step.nextLabel.trim()) return 'Le libellé du bouton est obligatoire.';
  if (!step.path.trim().startsWith('/')) return 'La page doit commencer par /.';
  if (step.alsoPath?.trim() && !step.alsoPath.trim().startsWith('/')) {
    return 'L’autre page doit commencer par /.';
  }
  if (!step.highlight.trim()) return 'Indiquez la zone à mettre en avant.';
  if (!step.aside) return null;
  if (!step.aside.pathPrefix.trim().startsWith('/')) return 'Le préfixe de la page de détail doit commencer par /.';
  if (!step.aside.title.trim() || !step.aside.text.trim() || !step.aside.backLabel.trim()) {
    return 'La page de détail est incomplète.';
  }
  return null;
}

function matchesStepPath(step: OnboardingStepInput, path: string): boolean {
  const normalized = normalizeOnboardingPath(path);
  if (normalized === normalizeOnboardingPath(step.path)) return true;
  const also = step.alsoPath?.trim();
  return Boolean(also) && normalized === normalizeOnboardingPath(also!);
}

export function tourStepsFromContent(steps: OnboardingStepInput[]): OnboardingRuntimeStep[] {
  return steps.map((step) => {
    const aside = step.aside?.pathPrefix.trim()
      ? {
          match: (path: string) => {
            const normalized = normalizeOnboardingPath(path);
            const prefix = step.aside!.pathPrefix.trim();
            return normalized.startsWith(prefix) && !matchesStepPath(step, normalized);
          },
          title: step.aside.title,
          text: step.aside.text,
          backLabel: step.aside.backLabel,
        }
      : undefined;

    return {
      id: step.id,
      path: step.path,
      match: (path: string) => matchesStepPath(step, path),
      title: step.title,
      text: step.text,
      nextLabel: step.nextLabel,
      highlight: step.highlight,
      aside,
    };
  });
}
