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
  const initialPath = useRef(location.pathname);
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
  const swipeStart = useRef<number | null>(null);

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

  const onHandlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    swipeStart.current = event.clientY;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }
  };

  const onHandlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start != null && event.clientY - start > 36) setCollapsed(true);
  };

  if (collapsed) {
    return createPortal(
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Reprendre"
        className="fixed z-[100] inset-x-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] inline-flex min-h-[44px] max-w-[calc(100vw-1.5rem)] items-center justify-center rounded-xl border border-primary-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] ring-2 ring-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-auto lg:justify-start lg:rounded-lg lg:shadow-card"
      >
        <span className="min-w-0 truncate">Reprendre · {title}</span>
      </button>,
      document.body
    );
  }

  return createPortal(
    <aside
      ref={panelRef}
      className="fixed z-[100] inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] flex max-h-[min(42dvh,17rem)] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-primary-200 bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.14)] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:max-h-[min(70dvh,32rem)] lg:w-[22rem] lg:rounded-xl lg:border-b lg:shadow-card lg:ring-2 lg:ring-primary-500"
      aria-label="Visite de l’application"
    >
      <div
        data-testid="onboarding-sheet-handle"
        className="flex touch-none justify-center pb-1 pt-2 lg:hidden"
        onPointerDown={onHandlePointerDown}
        onPointerUp={onHandlePointerUp}
      >
        <span className="h-1 w-10 rounded-full bg-gray-300" aria-hidden />
      </div>
      <div
        className="mx-4 mt-1 h-1 overflow-hidden rounded-full bg-gray-100 lg:mt-3"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={stepIndex + 1}
        aria-label="Étape de la visite"
      >
        <div
          className="h-full rounded-full bg-primary-600"
          style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 tabular-nums lg:text-sm lg:normal-case lg:tracking-normal">
            {stepIndex + 1} sur {steps.length}
          </p>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:min-w-[44px] lg:px-0"
          >
            <span className="lg:sr-only">Réduire</span>
            <svg className="hidden h-5 w-5 lg:block" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div aria-live="polite">
          <h2 ref={titleRef} tabIndex={-1} className="text-base font-semibold text-gray-900 outline-none">
            {title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{text}</p>
          {!placed ? (
            <p className="mt-2 text-sm text-gray-500">Vous n’êtes pas sur cette page.</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-1 border-t border-gray-100 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between lg:px-4">
        <div className="flex flex-wrap items-center justify-between gap-1 lg:contents">
          <button
            type="button"
            onClick={finish}
            className="min-h-[44px] flex-1 rounded-lg px-2 py-2 text-sm text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:flex-none"
          >
            Plus tard
          </button>
          {startAtHome ? (
            <button
              type="button"
              onClick={restart}
              className="min-h-[44px] flex-1 rounded-lg px-2 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:flex-none"
            >
              Recommencer
            </button>
          ) : null}
          {onAside && step.aside ? (
            <button
              type="button"
              onClick={() => navigate(step.path)}
              className="min-h-[44px] flex-1 rounded-lg px-2 py-2 text-center text-sm font-medium leading-tight text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:order-2 lg:ml-auto lg:flex-none"
            >
              {step.aside.backLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              disabled={stepIndex === 0}
              className="min-h-[44px] flex-1 rounded-lg px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-default disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:order-2 lg:ml-auto lg:flex-none"
            >
              Retour
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={advance}
          className="btn-primary min-h-[44px] w-full whitespace-normal px-3 text-center leading-snug lg:order-3 lg:w-auto"
        >
          {primaryLabel}
        </button>
      </div>
    </aside>,
    document.body
  );
}
