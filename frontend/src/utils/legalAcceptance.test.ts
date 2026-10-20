import { describe, expect, it } from 'vitest';
import { hasCurrentLegalAcceptance, legalConfig } from '../config/legal';

describe('hasCurrentLegalAcceptance', () => {
  const accepted = {
    privacyPolicyAcceptedAt: '2026-10-20T09:00:00.000Z',
    termsAcceptedAt: '2026-10-20T09:00:00.000Z',
    privacyPolicyVersion: legalConfig.policyVersion,
    termsVersion: legalConfig.termsVersion,
  };

  it('accepte la version en cours des deux documents', () => {
    expect(hasCurrentLegalAcceptance(accepted)).toBe(true);
  });

  it('redemande une confirmation si la version de la politique a changé', () => {
    expect(hasCurrentLegalAcceptance({ ...accepted, privacyPolicyVersion: '2026-01-15' })).toBe(false);
  });

  it('redemande une confirmation si aucune version n’a été enregistrée', () => {
    expect(
      hasCurrentLegalAcceptance({
        privacyPolicyAcceptedAt: accepted.privacyPolicyAcceptedAt,
        termsAcceptedAt: accepted.termsAcceptedAt,
      })
    ).toBe(false);
  });
});
