import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** v3 : le guide ouvre les pages. v2 était une fenêtre qui les cachait. */
export const ONBOARDING_STORAGE_KEY = 'alternancetracker_onboarding_done_v3';
const STEP_STORAGE_KEY = 'alternancetracker_onboarding_step_v3';
export const ONBOARDING_REPLAY_EVENT = 'alternancetracker:replay-onboarding';

type TourStep = {
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

const steps: TourStep[] = [
  {
    id: 'accueil',
    path: '/',
    match: (path) => path === '/',
    title: 'Cette semaine',
    text: 'Les candidatures, les relances et les entretiens à venir sont ici. Les quatre cartes mènent aux autres pages.',
    nextLabel: 'Offres',
    highlight: 'home-shortcuts',
  },
  {
    id: 'offres',
    path: '/offres',
    match: (path) => path === '/offres',
    title: 'Les annonces',
    text: 'La liste tient compte de votre ville et de votre domaine, s’ils sont dans le profil. Ouvrez une offre pour la ranger dans vos candidatures.',
    nextLabel: 'Candidatures',
    highlight: 'offers-search',
    aside: {
      match: (path) => path.startsWith('/offres/'),
      title: 'Cette offre',
      text: '« Ajouter à mes candidatures » crée le dossier. « Voir l’offre originale » ouvre l’annonce.',
      backLabel: 'Liste des offres',
    },
  },
  {
    id: 'candidatures',
    path: '/applications',
    match: (path) => path === '/applications',
    title: 'Vos dossiers',
    text: 'Chaque carte avance d’une étape à l’autre, de « À postuler » jusqu’au refus. Une date d’entretien saisie sur la fiche se retrouve dans le calendrier.',
    nextLabel: 'Calendrier',
    highlight: 'applications-views',
    aside: {
      match: (path) => path.startsWith('/applications/'),
      title: 'La fiche',
      text: 'Statut, contact, relance, date et lieu d’entretien. Enregistrez avant de partir.',
      backLabel: 'Toutes les candidatures',
    },
  },
  {
    id: 'calendrier',
    path: '/calendar',
    match: (path) => path === '/calendar',
    title: 'Entretiens et relances',
    text: 'Le mois reprend les dates déjà notées sur les fiches. Le bandeau vert, lui, prépare le rythme à envoyer à une entreprise.',
    nextLabel: 'Préparer',
    highlight: 'calendar-rhythm',
  },
  {
    id: 'cv',
    path: '/preparer/cv',
    match: (path) => path === '/preparer/cv' || path === '/preparer',
    title: 'Mon CV',
    text: 'Les sections se remplissent ici, ou à partir d’un PDF. L’autre onglet de cette page donne une analyse pour l’alternance.',
    nextLabel: 'Lettres',
    highlight: 'preparer-cv',
  },
  {
    id: 'lettres',
    path: '/preparer/lettres',
    match: (path) => path === '/preparer/lettres',
    title: 'La lettre',
    text: 'Un modèle selon le type d’entreprise, ou un texte généré depuis une candidature déjà créée.',
    nextLabel: 'Analyser une offre',
    highlight: 'preparer-lettres',
  },
  {
    id: 'analyser',
    path: '/preparer/analyser-offre',
    match: (path) => path === '/preparer/analyser-offre',
    title: 'Analyser une offre',
    text: 'Collez le lien, ou le texte de l’annonce. Ça indique quoi mettre en avant dans le CV et la lettre.',
    nextLabel: 'Conseils',
    highlight: 'preparer-analyser',
  },
  {
    id: 'conseils',
    path: '/preparer/conseils',
    match: (path) => path === '/preparer/conseils',
    title: 'Conseils',
    text: 'CV, recherche, entretien, relances. L’onglet s’appelle Conseils, la page s’intitule « Coaching alternance ».',
    nextLabel: 'Rythme',
    highlight: 'preparer-conseils',
  },
  {
    id: 'rythme',
    path: '/rythme',
    match: (path) => path === '/rythme',
    title: 'Jours d’école, jours d’entreprise',
    text: 'La zone de vacances et le rythme dessinent le contrat. Le lien en bas s’ouvre sans compte. Pour revenir : la carte Rythme, sur l’accueil.',
    nextLabel: 'Mon espace',
    highlight: 'rhythm-settings',
  },
  {
    id: 'profil',
    path: '/profile',
    match: (path) => path === '/profile',
    title: 'Mon espace',
    text: 'École, ville et objectif de la semaine servent aux offres et à l’accueil. Les e-mails et la cloche se règlent plus bas, dans Notifications.',
    nextLabel: 'Fermer',
    highlight: 'nav-profile',
  },
];

interface OnboardingTourProps {
  enabled: boolean;
  onFinish: () => void;
  /** Rejoue le parcours depuis l’accueil, même si une autre page est ouverte. */
  startAtHome?: boolean;
  /** Masque le panneau, par exemple pendant le menu mobile. */
  hidden?: boolean;
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, '') || '/';
}

function stepIndexForPath(path: string): number {
  const normalized = normalizePath(path);
  return steps.findIndex((step) => step.match(normalized) || Boolean(step.aside?.match(normalized)));
}

function readStoredStep(): number | null {
  try {
    const raw = sessionStorage.getItem(STEP_STORAGE_KEY);
    if (!raw) return null;
    const index = steps.findIndex((step) => step.id === raw);
    return index >= 0 ? index : null;
  } catch {
    return null;
  }
}

export function shouldShowOnboarding(): boolean {
  try {
    return !localStorage.getItem(ONBOARDING_STORAGE_KEY);
  } catch {
    return false;
  }
}

export function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    sessionStorage.removeItem(STEP_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function replayOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    sessionStorage.removeItem(STEP_STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(ONBOARDING_REPLAY_EVENT));
}

function clearHighlights(): void {
  document.querySelectorAll('.onboarding-target').forEach((node) => {
    node.classList.remove('onboarding-target');
  });
}

export default function OnboardingTour({
  enabled,
  onFinish,
  startAtHome = false,
  hidden = false,
}: OnboardingTourProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialPath = useRef(location.pathname);
  const skipRouteSync = useRef(startAtHome);
  const [stepIndex, setStepIndex] = useState(() => {
    if (startAtHome) return 0;
    const current = stepIndexForPath(location.pathname);
    if (current >= 0) return current;
    const stored = readStoredStep();
    return stored != null ? stored : 0;
  });
  const [collapsed, setCollapsed] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusTitle = useRef(false);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const path = normalizePath(location.pathname);
  const onPage = step.match(path);
  const onAside = Boolean(!onPage && step.aside?.match(path));
  const placed = onPage || onAside;

  useEffect(() => {
    if (!enabled || !startAtHome) return;
    if (normalizePath(initialPath.current) !== '/') navigate('/');
  }, [enabled, startAtHome, navigate]);

  useEffect(() => {
    if (!enabled) return;
    if (skipRouteSync.current) {
      if (normalizePath(location.pathname) === '/') skipRouteSync.current = false;
      return;
    }
    const index = stepIndexForPath(location.pathname);
    if (index >= 0) setStepIndex(index);
  }, [enabled, location.pathname]);

  useEffect(() => {
    if (!enabled) return;
    try {
      sessionStorage.setItem(STEP_STORAGE_KEY, step.id);
    } catch {
      // ignore
    }
  }, [enabled, step.id]);

  useEffect(() => {
    setCollapsed(false);
  }, [stepIndex]);

  useEffect(() => {
    if (!focusTitle.current || hidden || collapsed) return;
    focusTitle.current = false;
    titleRef.current?.focus();
  }, [stepIndex, path, hidden, collapsed]);

  useEffect(() => {
    if (!enabled || hidden) {
      clearHighlights();
      return;
    }

    let stopped = false;
    let attempts = 0;

    const apply = () => {
      clearHighlights();
      document.querySelectorAll(`[data-tour="${step.highlight}"]`).forEach((node) => {
        node.classList.add('onboarding-target');
      });
    };

    apply();
    const timer = window.setInterval(() => {
      if (stopped) return;
      attempts += 1;
      apply();
      const found = document.querySelector(`[data-tour="${step.highlight}"]`);
      if (found || attempts >= 12) window.clearInterval(timer);
    }, 150);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      clearHighlights();
    };
  }, [enabled, hidden, step.highlight, location.pathname]);

  const finish = () => {
    markOnboardingDone();
    onFinish();
  };

  const goTo = (index: number) => {
    const next = steps[index];
    if (!next) {
      finish();
      return;
    }
    focusTitle.current = true;
    setStepIndex(index);
    if (!next.match(normalizePath(location.pathname))) navigate(next.path);
  };

  if (!enabled || hidden) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed z-50 right-3 lg:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 inline-flex items-center min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-card hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        Reprendre
      </button>
    );
  }

  const title = onAside && step.aside ? step.aside.title : step.title;
  const text = onAside && step.aside ? step.aside.text : step.text;
  const isLast = stepIndex === steps.length - 1;

  return (
    <aside
      className="fixed z-50 left-3 right-3 sm:left-auto sm:right-6 sm:w-[22rem] bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 rounded-xl border border-gray-200 bg-white shadow-card"
      aria-label="Visite de l’application"
    >
      <div className="px-4 pt-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500 tabular-nums">
            {stepIndex + 1} / {steps.length}
          </p>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Ranger"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <h2 ref={titleRef} tabIndex={-1} className="text-base font-semibold text-gray-900 outline-none">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{text}</p>
        {!placed ? (
          <p className="mt-2 text-sm text-gray-500">Vous n’êtes pas sur cette page.</p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-2.5">
        <button
          type="button"
          onClick={finish}
          className="rounded-lg px-2 py-2 min-h-[44px] text-sm text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          Plus tard
        </button>
        <div className="flex items-center gap-1">
          {onAside && step.aside ? (
            <button
              type="button"
              onClick={() => navigate(step.path)}
              className="rounded-lg px-2 py-2 min-h-[44px] text-sm font-medium text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {step.aside.backLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              disabled={stepIndex === 0}
              className="rounded-lg px-2 py-2 min-h-[44px] text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-default disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Retour
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!placed) {
                focusTitle.current = true;
                navigate(step.path);
                return;
              }
              if (isLast) {
                finish();
                return;
              }
              goTo(stepIndex + 1);
            }}
            className="btn-primary min-h-[44px] px-3"
          >
            {placed ? step.nextLabel : 'Y aller'}
          </button>
        </div>
      </div>
    </aside>
  );
}
