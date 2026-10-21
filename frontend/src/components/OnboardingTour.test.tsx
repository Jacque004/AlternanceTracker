import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ONBOARDING_STEPS, type OnboardingStepInput } from './onboardingContent';
import OnboardingTour, {
  ONBOARDING_REPLAY_EVENT,
  ONBOARDING_STORAGE_KEY,
  markOnboardingDone,
  replayOnboarding,
  shouldShowOnboarding,
} from './OnboardingTour';

function Path() {
  const { pathname } = useLocation();
  return <div data-testid="path">{pathname}</div>;
}

function renderTour(path: string, props?: { startAtHome?: boolean; onFinish?: () => void; userId?: string }) {
  const onFinish = props?.onFinish ?? vi.fn();
  function Harness() {
    const [steps, setSteps] = useState<OnboardingStepInput[] | undefined>(undefined);
    return (
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <button type="button" onClick={() => setSteps(DEFAULT_ONBOARDING_STEPS.map((step) => ({ ...step })))}>
                  Charger les étapes
                </button>
                <OnboardingTour
                  enabled
                  onFinish={onFinish}
                  startAtHome={props?.startAtHome}
                  userId={props?.userId ?? 'user-1'}
                  steps={steps}
                />
                <Path />
                <Link to="/offres/42">Ouvrir une offre</Link>
                <div data-tour="home-shortcuts">Accueil</div>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  }
  render(<Harness />);
  return {
    onFinish,
    rerenderTour: () => {
      fireEvent.click(screen.getByRole('button', { name: 'Charger les étapes' }));
    },
  };
}

const journey: { label: string; path: string; title: RegExp }[] = [
  { label: 'Offres', path: '/offres', title: /^Les annonces$/ },
  { label: 'Candidatures', path: '/applications', title: /^Vos dossiers$/ },
  { label: 'Calendrier', path: '/calendar', title: /^Entretiens et relances$/ },
  { label: 'Préparer', path: '/preparer/cv', title: /^Mon CV$/ },
  { label: 'Lettres', path: '/preparer/lettres', title: /^La lettre$/ },
  { label: 'Analyser une offre', path: '/preparer/analyser-offre', title: /^Analyser une offre$/ },
  { label: 'Conseils', path: '/preparer/conseils', title: /^Conseils$/ },
  { label: 'Rythme', path: '/rythme', title: /Jours d’école, jours d’entreprise/ },
  { label: 'Mon espace', path: '/profile', title: /^Mon espace$/ },
];

describe('OnboardingTour', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('ouvre chaque page du parcours et termine sur Mon espace', () => {
    const { onFinish } = renderTour('/');

    expect(screen.getByRole('heading', { name: /^Cette semaine$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retour' })).toBeDisabled();
    expect(screen.getByTestId('path')).toHaveTextContent('/');

    for (const step of journey) {
      fireEvent.click(screen.getByRole('button', { name: step.label }));
      expect(screen.getByTestId('path')).toHaveTextContent(step.path);
      expect(screen.getByRole('heading', { name: step.title })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onFinish).toHaveBeenCalledOnce();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
    expect(shouldShowOnboarding({ userId: 'user-1', onboardingCompletedAt: null })).toBe(false);
  });

  it('revient à la page précédente', () => {
    renderTour('/');
    fireEvent.click(screen.getByRole('button', { name: 'Offres' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/');
    expect(screen.getByRole('heading', { name: /^Cette semaine$/ })).toBeInTheDocument();
  });

  it('explique la fiche d’offre sans quitter le guide', () => {
    renderTour('/');
    fireEvent.click(screen.getByRole('button', { name: 'Offres' }));
    fireEvent.click(screen.getByRole('link', { name: 'Ouvrir une offre' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/offres/42');
    expect(screen.getByRole('heading', { name: /^Cette offre$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Liste des offres' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/offres');
    expect(screen.getByRole('heading', { name: /^Les annonces$/ })).toBeInTheDocument();
  });

  it('suit le menu quand on change de page soi-même', () => {
    renderTour('/');
    fireEvent.click(screen.getByRole('link', { name: 'Ouvrir une offre' }));
    expect(screen.getByRole('heading', { name: /^Cette offre$/ })).toBeInTheDocument();
  });

  it('propose d’ouvrir la page si on n’est pas dessus', () => {
    renderTour('/a-propos');
    expect(screen.getByRole('button', { name: 'Y aller' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Y aller' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/');
  });

  it('recommence le test admin depuis la première étape', async () => {
    renderTour('/offres', { startAtHome: true });
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));
    fireEvent.click(screen.getByRole('button', { name: 'Offres' }));
    expect(screen.getByRole('heading', { name: /^Les annonces$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recommencer' }));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));
    expect(screen.getByRole('heading', { name: /^Cette semaine$/ })).toBeInTheDocument();
  });

  it('reprend depuis l’accueil quand on relance le guide', async () => {
    renderTour('/profile', { startAtHome: true });
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));
    expect(screen.getByRole('heading', { name: /^Cette semaine$/ })).toBeInTheDocument();
  });

  it('reste sur la première étape si le contenu arrive pendant le rejeu', async () => {
    const view = renderTour('/profile', { startAtHome: true });
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));

    view.rerenderTour();

    expect(screen.getByRole('heading', { name: /^Cette semaine$/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^Mon espace$/ })).not.toBeInTheDocument();
  });

  it('se réduit puis se rouvre', () => {
    renderTour('/');
    fireEvent.click(screen.getByRole('button', { name: 'Réduire' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre' }));
    expect(screen.getByRole('heading', { name: /^Cette semaine$/ })).toBeInTheDocument();
  });

  it('affiche la progression de la visite', () => {
    renderTour('/');
    expect(screen.getByRole('progressbar', { name: 'Étape de la visite' })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('progressbar', { name: 'Étape de la visite' })).toHaveAttribute('aria-valuemax', '10');
  });

  it('passe le guide et le marque comme vu', () => {
    const { onFinish } = renderTour('/');
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(onFinish).toHaveBeenCalledOnce();
    expect(shouldShowOnboarding({ userId: 'user-1', onboardingCompletedAt: null })).toBe(false);
  });

  it('met en avant l’élément de la page', async () => {
    renderTour('/');
    await waitFor(() => {
      expect(document.querySelector('[data-tour="home-shortcuts"]')).toHaveClass('onboarding-target');
    });
  });

  it('permet de revoir le guide', () => {
    markOnboardingDone('user-1');
    expect(shouldShowOnboarding({ userId: 'user-1', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' })).toBe(false);
    const onReplay = vi.fn();
    window.addEventListener(ONBOARDING_REPLAY_EVENT, onReplay);
    replayOnboarding('user-1');
    expect(shouldShowOnboarding({ userId: 'user-1', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' })).toBe(true);
    expect(onReplay).toHaveBeenCalledOnce();
    window.removeEventListener(ONBOARDING_REPLAY_EVENT, onReplay);
  });

  it('ne s’ouvre tout seul que pour un compte jamais connecté', () => {
    expect(shouldShowOnboarding({ userId: 'new-user', onboardingCompletedAt: null })).toBe(true);
    expect(shouldShowOnboarding({ userId: 'new-user', onboardingCompletedAt: undefined })).toBe(false);
    expect(
      shouldShowOnboarding({ userId: 'new-user', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' })
    ).toBe(false);
  });
});
