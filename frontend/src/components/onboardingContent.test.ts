import { describe, expect, it } from 'vitest';
import {
  createOnboardingStep,
  DEFAULT_ONBOARDING_STEPS,
  moveOnboardingStep,
  onboardingStepError,
  tourStepsFromContent,
} from './onboardingContent';

describe('contenu de la visite', () => {
  const steps = tourStepsFromContent(DEFAULT_ONBOARDING_STEPS);

  it('reconnaît la page principale et la page de détail', () => {
    const offers = steps.find((step) => step.id === 'offres');
    expect(offers?.match('/offres')).toBe(true);
    expect(offers?.aside?.match('/offres/42')).toBe(true);
    expect(offers?.aside?.match('/offres')).toBe(false);
  });

  it('ouvre le CV aussi sur /preparer', () => {
    const cv = steps.find((step) => step.id === 'cv');
    expect(cv?.match('/preparer/cv')).toBe(true);
    expect(cv?.match('/preparer')).toBe(true);
  });

  it('déplace et valide une étape', () => {
    const moved = moveOnboardingStep(DEFAULT_ONBOARDING_STEPS, 0, 1);
    expect(moved[0]?.id).toBe('offres');
    expect(moved[1]?.id).toBe('accueil');

    const created = createOnboardingStep();
    expect(onboardingStepError(created)).toBe('Le texte est obligatoire.');
    expect(onboardingStepError({ ...created, text: 'Un texte.' })).toBeNull();
  });
});
