import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingAdminPanel from './OnboardingAdminPanel';
import { ONBOARDING_PREVIEW_EVENT } from './OnboardingTour';
import { saveOnboardingSteps } from '../services/onboardingService';

vi.mock('../services/onboardingService', () => ({
  loadOnboardingSteps: vi.fn(async () => [
    {
      id: 'accueil',
      path: '/',
      title: 'Bienvenue',
      text: 'Texte initial',
      nextLabel: 'Suite',
      highlight: 'home-shortcuts',
      aside: null,
    },
  ]),
  saveOnboardingSteps: vi.fn(async () => undefined),
}));

describe('OnboardingAdminPanel', () => {
  beforeEach(() => {
    vi.mocked(saveOnboardingSteps).mockClear();
  });

  it('modifie le texte, retire une étape et en ajoute une', async () => {
    render(<OnboardingAdminPanel userId="admin-1" />);

    const title = await screen.findByDisplayValue('Bienvenue');
    fireEvent.change(title, { target: { value: 'Bienvenue modifié' } });
    expect(screen.getByDisplayValue('Bienvenue modifié')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Texte initial'), {
      target: { value: 'Nouveau texte' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));
    expect(screen.queryByDisplayValue('Bienvenue modifié')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
    expect(screen.getByDisplayValue('Nouvelle étape')).toBeInTheDocument();
  });

  it('teste le parcours avec le texte en cours', async () => {
    render(<OnboardingAdminPanel userId="admin-1" />);
    const title = await screen.findByDisplayValue('Bienvenue');
    fireEvent.change(title, { target: { value: 'Essai admin' } });

    const onPreview = vi.fn();
    window.addEventListener(ONBOARDING_PREVIEW_EVENT, onPreview);
    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    expect(onPreview).toHaveBeenCalledOnce();
    const detail = (onPreview.mock.calls[0]?.[0] as CustomEvent).detail;
    expect(detail.steps[0].title).toBe('Essai admin');
    window.removeEventListener(ONBOARDING_PREVIEW_EVENT, onPreview);
  });
});
