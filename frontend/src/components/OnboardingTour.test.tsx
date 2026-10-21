import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

function renderTour(path: string, props?: { startAtHome?: boolean; onFinish?: () => void }) {
  const onFinish = props?.onFinish ?? vi.fn();
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <OnboardingTour enabled onFinish={onFinish} startAtHome={props?.startAtHome} />
              <Path />
              <Link to="/offres/42">Ouvrir une offre</Link>
              <div data-tour="home-shortcuts">Accueil</div>
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
  return { onFinish };
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
    expect(shouldShowOnboarding()).toBe(false);
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

  it('reprend depuis l’accueil quand on relance le guide', async () => {
    renderTour('/profile', { startAtHome: true });
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));
    expect(screen.getByRole('heading', { name: /^Cette semaine$/ })).toBeInTheDocument();
  });

  it('se réduit puis se rouvre', () => {
    renderTour('/');
    fireEvent.click(screen.getByRole('button', { name: 'Ranger' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre' }));
    expect(screen.getByRole('heading', { name: /^Cette semaine$/ })).toBeInTheDocument();
  });

  it('passe le guide et le marque comme vu', () => {
    const { onFinish } = renderTour('/');
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(onFinish).toHaveBeenCalledOnce();
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('met en avant l’élément de la page', async () => {
    renderTour('/');
    await waitFor(() => {
      expect(document.querySelector('[data-tour="home-shortcuts"]')).toHaveClass('onboarding-target');
    });
  });

  it('permet de revoir le guide', () => {
    markOnboardingDone();
    expect(shouldShowOnboarding()).toBe(false);
    const onReplay = vi.fn();
    window.addEventListener(ONBOARDING_REPLAY_EVENT, onReplay);
    replayOnboarding();
    expect(shouldShowOnboarding()).toBe(true);
    expect(onReplay).toHaveBeenCalledOnce();
    window.removeEventListener(ONBOARDING_REPLAY_EVENT, onReplay);
  });
});
