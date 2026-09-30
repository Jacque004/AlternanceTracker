import { describe, expect, it } from 'vitest';
import {
  domainFromFormation,
  educationLevelFromStudyYear,
  offerFiltersFromProfile,
} from './offerProfileFilters';

const facets = {
  domains: ['Informatique', 'Gestion', 'Commerce'],
  educationLevels: ['Bac', 'Bac+2', 'Bac+3', 'Bac+5'],
};

describe('filtres d’offres depuis le profil', () => {
  it('déduit le niveau depuis l’année', () => {
    expect(educationLevelFromStudyYear('M1')).toBe('Bac+5');
    expect(educationLevelFromStudyYear('L3')).toBe('Bac+3');
    expect(educationLevelFromStudyYear('BTS')).toBe('Bac+2');
    expect(educationLevelFromStudyYear('Bac')).toBe('Bac');
  });

  it('reconnaît un domaine cité dans la formation', () => {
    expect(domainFromFormation('Master Informatique', facets.domains)).toBe('Informatique');
  });

  it('privilégie les préférences enregistrées', () => {
    expect(
      offerFiltersFromProfile(
        {
          preferredLocation: 'Lyon',
          preferredDomain: 'Commerce',
          preferredEducationLevel: 'Bac+2',
          formation: 'Master Informatique',
          studyYear: 'M1',
        },
        facets
      )
    ).toEqual({
      location: 'Lyon',
      domain: 'Commerce',
      educationLevel: 'Bac+2',
    });
  });

  it('retombe sur la formation et l’année si aucune préférence n’est enregistrée', () => {
    expect(
      offerFiltersFromProfile(
        { formation: 'Licence informatique', studyYear: 'L3' },
        facets
      )
    ).toEqual({
      location: '',
      domain: 'Informatique',
      educationLevel: 'Bac+3',
    });
  });
});
