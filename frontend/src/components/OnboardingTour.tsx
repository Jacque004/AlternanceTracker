import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  DEFAULT_ONBOARDING_STEPS,
  type OnboardingRuntimeStep,
  type OnboardingStepInput,
  tourStepsFromContent,
  normalizeOnboardingPath,
} from './onboardingContent';

/** v3 : le guide ouvre les pages. v2 était une fenêtre qui les cachait. */
export const ONBOARDING_STORAGE_KEY = 'alternancetracker_onboarding_done_v3';
const STEP_STORAGE_KEY = 'alternancetracker_onboarding_step_v3';
const SESSION_STORAGE_KEY = 'alternancetracker_onboarding_session_user';
export const ONBOARDING_REPLAY_EVENT = 'alternancetracker:replay-onboarding';

export function onboardingSeenStorageKey(userId: string): string {
  return `alternancetracker_onboarding_seen_${userId}`;
}

export const ONBOARDING_PREVIEW_EVENT = 'alternancetracker:preview-onboarding';

export type OnboardingPreviewDetail = {
  userId: string;
  steps: OnboardingStepInput[];
};

interface OnboardingTourProps {
  enabled: boolean;
  onFinish: () => void;
  /** Compte concerné, pour ne pas rejouer la visite à la prochaine connexion. */
  userId?: string;
  /** Rejoue le parcours depuis l’accueil, même si une autre page est ouverte. */
  startAtHome?: boolean;
  /** Masque le panneau, par exemple pendant le menu mobile. */
  hidden?: boolean;
  /** Étapes à afficher. Sans valeur, le modèle d’origine est utilisé. */
  steps?: OnboardingStepInput[];
}

function stepIndexForPath(steps: OnboardingRuntimeStep[], path: string): number {
  const normalized = normalizeOnboardingPath(path);
  return steps.findIndex((step) => step.match(normalized) || Boolean(step.aside?.match(normalized)));
}

function readStoredStep(steps: OnboardingRuntimeStep[]): number | null {
  try {
    const raw = sessionStorage.getItem(STEP_STORAGE_KEY);
    if (!raw) return null;
    const index = steps.findIndex((step) => step.id === raw);
    return index >= 0 ? index : null;
  } catch {
    return null;
  }
}

/** Lance la visite avec le contenu en cours d’édition, sans attendre l’enregistrement. */
export function previewOnboarding(userId: string, steps: OnboardingStepInput[]): void {
  beginOnboardingSession(userId);
  window.dispatchEvent(
    new CustomEvent<OnboardingPreviewDetail>(ONBOARDING_PREVIEW_EVENT, {
      detail: { userId, steps },
    })
  );
}

export function isOnboardingSession(userId: string): boolean {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) === userId;
  } catch {
    return false;
  }
}

/** Ouvre la visite pour cette connexion, depuis la première étape. */
export function beginOnboardingSession(userId: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, userId);
    sessionStorage.removeItem(STEP_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function endOnboardingSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(STEP_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function rememberOnboardingSeen(userId: string): void {
  try {
    localStorage.setItem(onboardingSeenStorageKey(userId), '1');
  } catch {
    // ignore
  }
}

export function hasOnboardingBeenSeen(userId: string): boolean {
  try {
    return localStorage.getItem(onboardingSeenStorageKey(userId)) === '1';
  } catch {
    return false;
  }
}

/**
 * Vrai seulement pour un compte qui n’a jamais ouvert l’application,
 * ou pour la visite déjà en cours sur cette connexion (y compris un rejeu manuel).
 */
export function shouldShowOnboarding(params: {
  userId: string;
  onboardingCompletedAt?: string | null;
}): boolean {
  if (isOnboardingSession(params.userId)) return true;
  if (hasOnboardingBeenSeen(params.userId)) return false;
  return params.onboardingCompletedAt === null;
}

export function markOnboardingDone(userId?: string): void {
  if (userId) rememberOnboardingSeen(userId);
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
  } catch {
    // ignore
  }
  endOnboardingSession();
}

export function replayOnboarding(userId?: string): void {
  if (userId) beginOnboardingSession(userId);
  window.dispatchEvent(new Event(ONBOARDING_REPLAY_EVENT));
}

/** Enregistre sur le compte que la première connexion a eu lieu. */
export async function recordFirstConnection(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) return false;
  rememberOnboardingSeen(userId);
  return true;
}

function clearHighlights(): void {
  document.querySelectorAll('.onboarding-target').forEach((node) => {
    node.classList.remove('onboarding-target');
  });
}

function prefersCompactTour(): boolean {
  try {
    return window.matchMedia('(max-width: 1023px)').matches;
  } catch {
    return false;
  }
}

export default function OnboardingTour({
  enabled,
  onFinish,
  userId,
  startAtHome = false,
  hidden = false,
  steps: stepContent,
}: OnboardingTourProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const steps = useMemo(
    () => tourStepsFromContent(stepContent ?? DEFAULT_ONBOARDING_STEPS),
    [stepContent]
  );
  const followRoute = useRef(!startAtHome);
  const pendingStep = useRef<number | null>(null);
  const [stepIndex, setStepIndex] = useState(() => {
    const initialSteps = tourStepsFromContent(stepContent ?? DEFAULT_ONBOARDING_STEPS);
    if (startAtHome || initialSteps.length === 0) return 0;
    const current = stepIndexForPath(initialSteps, location.pathname);
    if (current >= 0) return current;
    const stored = readStoredStep(initialSteps);
    return stored != null ? stored : 0;
  });
  const [collapsed, setCollapsed] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const focusTitle = useRef(false);
  const scrolledHighlight = useRef<string | null>(null);

  const step = steps.length > 0 ? steps[Math.min(stepIndex, steps.length - 1)] : undefined;
  const path = normalizeOnboardingPath(location.pathname);
  const onPage = step ? step.match(path) : false;
  const onAside = Boolean(step && !onPage && step.aside?.match(path));
  const placed = onPage || onAside;

  const firstPath = normalizeOnboardingPath(steps[0]?.path || '/');

  useEffect(() => {
    if (!enabled || !startAtHome || followRoute.current) return;
    if (normalizeOnboardingPath(location.pathname) !== firstPath) navigate(firstPath);
  }, [enabled, startAtHome, navigate, firstPath, location.pathname]);

  useEffect(() => {
    if (!enabled) return;
    if (!followRoute.current) {
      setStepIndex(0);
      return;
    }
    const normalized = normalizeOnboardingPath(location.pathname);
    if (pendingStep.current != null) {
      const pending = steps[pendingStep.current];
      if (pending && (pending.match(normalized) || pending.aside?.match(normalized))) {
        const index = pendingStep.current;
        pendingStep.current = null;
        setStepIndex(index);
      }
      return;
    }
    const index = stepIndexForPath(steps, normalized);
    if (index >= 0) setStepIndex(index);
  }, [enabled, location.pathname, steps]);

  useEffect(() => {
    if (!enabled || !step) return;
    try {
      sessionStorage.setItem(STEP_STORAGE_KEY, step.id);
    } catch {
      // ignore
    }
  }, [enabled, step]);

  useEffect(() => {
    setCollapsed(false);
  }, [stepIndex]);

  useEffect(() => {
    if (!enabled || hidden || collapsed || prefersCompactTour()) return;
    panelRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (!focusTitle.current) titleRef.current?.focus();
  }, [enabled, hidden, collapsed, step?.id]);

  useEffect(() => {
    if (!focusTitle.current || hidden || collapsed) return;
    focusTitle.current = false;
    if (prefersCompactTour()) return;
    titleRef.current?.focus();
  }, [stepIndex, path, hidden, collapsed]);

  useEffect(() => {
    if (!enabled || hidden || !step) {
      clearHighlights();
      return;
    }

    const apply = () => {
      clearHighlights();
      const highlight =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(step.highlight)
          : step.highlight.replace(/["\\]/g, '');
      let nodes: NodeListOf<Element>;
      try {
        nodes = document.querySelectorAll(`[data-tour="${highlight}"]`);
      } catch {
        return false;
      }
      nodes.forEach((node) => node.classList.add('onboarding-target'));
      const target = Array.from(nodes).find((node) => !node.closest('header, nav'));
      if (target && prefersCompactTour() && scrolledHighlight.current !== step.id) {
        scrolledHighlight.current = step.id;
        try {
          target.scrollIntoView({ block: 'center', inline: 'nearest' });
        } catch {
          // ignore
        }
      }
      return nodes.length > 0;
    };

    if (apply()) {
      return () => clearHighlights();
    }

    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const stop = window.setTimeout(() => observer.disconnect(), 8000);

    return () => {
      observer.disconnect();
      window.clearTimeout(stop);
      clearHighlights();
    };
  }, [enabled, hidden, step, location.pathname]);

  const finish = () => {
    markOnboardingDone(userId);
    onFinish();
  };

  const restart = () => {
    followRoute.current = false;
    pendingStep.current = null;
    focusTitle.current = true;
    setStepIndex(0);
    const target = normalizeOnboardingPath(steps[0]?.path || '/');
    if (normalizeOnboardingPath(location.pathname) !== target) navigate(target);
  };

  const goTo = (index: number) => {
    const next = steps[index];
    if (!next) {
      finish();
      return;
    }
    followRoute.current = true;
    focusTitle.current = true;
    setStepIndex(index);
    const normalized = normalizeOnboardingPath(location.pathname);
    if (!next.match(normalized) && !next.aside?.match(normalized)) {
      pendingStep.current = index;
      navigate(next.path);
      return;
    }
    pendingStep.current = null;
  };

  if (!enabled || hidden || !step) return null;

  const title = onAside && step.aside ? step.aside.title : step.title;
  const text = onAside && step.aside ? step.aside.text : step.text;
  const isLast = stepIndex === steps.length - 1;
  const primaryLabel = placed ? step.nextLabel : 'Y aller';

  const advance = () => {
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
  };

  if (collapsed) {
    return createPortal(
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Reprendre"
        className="fixed z-[100] inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] inline-flex min-h-11 max-w-[calc(100vw-1.5rem)] items-center justify-center rounded-2xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-auto lg:justify-start"
      >
        <span className="min-w-0 truncate">Reprendre · {title}</span>
      </button>,
      document.body
    );
  }

  const quietButton =
    'inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-default disabled:opacity-40 lg:min-h-10';

  return createPortal(
    <aside
      ref={panelRef}
      className="fixed z-[100] inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] flex max-h-[min(40dvh,16rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_16px_40px_-12px_rgba(15,23,42,0.28)] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:max-h-[min(70dvh,28rem)] lg:w-96"
      aria-label="Visite de l’application"
    >
      <div
        className="h-1 shrink-0 bg-primary-100"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={stepIndex + 1}
        aria-label="Étape de la visite"
      >
        <div
          className="h-full bg-primary-600 transition-[width] duration-200"
          style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pb-1 pt-3 lg:px-5 lg:pt-4">
        <div className="flex items-start justify-between gap-2">
          <div aria-live="polite" className="min-w-0">
            <p className="text-xs font-medium text-primary-700 tabular-nums">
              {stepIndex + 1} sur {steps.length}
            </p>
            <h2 ref={titleRef} tabIndex={-1} className="mt-0.5 text-base font-semibold leading-snug text-gray-900 outline-none">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Réduire"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{text}</p>
        {!placed ? (
          <p className="mt-2 text-sm text-gray-500">Vous n’êtes pas sur cette page.</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-t border-gray-100 px-2 py-2 lg:px-3 lg:py-3">
        <button type="button" onClick={finish} className={quietButton}>
          Plus tard
        </button>
        {startAtHome ? (
          <button type="button" onClick={restart} className={`${quietButton} text-primary-700 hover:bg-primary-50`}>
            Recommencer
          </button>
        ) : null}
        {onAside && step.aside ? (
          <button
            type="button"
            onClick={() => navigate(step.path)}
            className={`${quietButton} text-center leading-tight text-primary-700 hover:bg-primary-50`}
          >
            {step.aside.backLabel}
          </button>
        ) : (
          <button type="button" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0} className={quietButton}>
            Retour
          </button>
        )}
        <button
          type="button"
          onClick={advance}
          className="btn-primary ml-auto min-h-11 shrink-0 px-3.5 text-sm lg:min-h-10"
        >
          {primaryLabel}
        </button>
      </div>
    </aside>,
    document.body
  );
}
