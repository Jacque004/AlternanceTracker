import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const ONBOARDING_KEY = 'alternancetracker_onboarding_done_v2';

type StepId = 1 | 2 | 3 | 4;

interface OnboardingTourProps {
  enabled: boolean;
  onFinish: () => void;
}

const steps: {
  id: StepId;
  title: string;
  description: string;
  highlightSelector?: string;
  ctaLabel?: string;
  ctaTo?: string;
}[] = [
  {
    id: 1,
    title: 'Bienvenue sur AlternanceTracker',
    description:
      'Ici, vous suivez toutes vos candidatures, vos relances et vos entretiens. Commençons par un rapide tour.',
  },
  {
    id: 2,
    title: 'Mes candidatures',
    description:
      'Allez dans « Candidatures » pour ajouter vos candidatures, mettre à jour les statuts et suivre vos relances.',
    ctaLabel: 'Ouvrir Mes candidatures',
    ctaTo: '/applications',
  },
  {
    id: 3,
    title: 'Préparer CV et lettres',
    description:
      'Dans « Préparer », vous trouvez les conseils CV, l’analyse et la génération de lettres avec l’IA.',
    ctaLabel: 'Voir Préparer',
    ctaTo: '/preparer/cv',
  },
  {
    id: 4,
    title: 'Calendrier & profil',
    description:
      'Utilisez le calendrier pour voir les relances et entretiens à venir, et complétez votre profil pour des conseils plus personnalisés.',
    ctaLabel: 'Aller au calendrier',
    ctaTo: '/calendar',
  },
];

export function shouldShowOnboarding(): boolean {
  try {
    return !localStorage.getItem(ONBOARDING_KEY);
  } catch {
    return false;
  }
}

export function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    // ignore
  }
}

export default function OnboardingTour({ enabled, onFinish }: OnboardingTourProps) {
  const [step, setStep] = useState<StepId>(1);
  const location = useLocation();

  useEffect(() => {
    if (!enabled) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [enabled]);

  useEffect(() => {
    // Si l'utilisateur change complètement de page, on ne change pas l'étape,
    // mais le contenu reste cohérent (les CTA pointent déjà vers les pages clés).
  }, [location.pathname]);

  if (!enabled) return null;

  const current = steps.find((s) => s.id === step) ?? steps[0];

  const goNext = () => {
    if (step >= steps[steps.length - 1].id) {
      markOnboardingDone();
      onFinish();
      return;
    }
    setStep((s) => (s + 1) as StepId);
  };

  const goPrev = () => {
    if (step <= steps[0].id) return;
    setStep((s) => (s - 1) as StepId);
  };

  const handleSkip = () => {
    markOnboardingDone();
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-7 animate-in">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary-600 uppercase mb-1">
              Découvrir l&apos;application
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{current.title}</h2>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full p-1"
            aria-label="Fermer le tutoriel"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-700 mb-4">{current.description}</p>

        {current.ctaLabel && current.ctaTo && (
          <div className="mb-4">
            <Link
              to={current.ctaTo}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
            >
              {current.ctaLabel}
              <span aria-hidden>→</span>
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {steps.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`h-2.5 rounded-full transition-all ${
                  s.id === step ? 'w-6 bg-primary-600' : 'w-2.5 bg-gray-300'
                }`}
                aria-label={`Aller à l'étape ${s.id}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === steps[0].id}
              className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-default"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={goNext}
              className="px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              {step === steps[steps.length - 1].id ? 'Terminer' : 'Suivant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

