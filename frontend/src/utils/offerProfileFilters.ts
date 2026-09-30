export interface OfferProfileSource {
  preferredLocation?: string | null;
  preferredDomain?: string | null;
  preferredEducationLevel?: string | null;
  formation?: string | null;
  studyYear?: string | null;
}

export interface OfferProfileFacets {
  domains: string[];
  educationLevels: string[];
}

export interface OfferProfileFilters {
  location: string;
  domain: string;
  educationLevel: string;
}

function compact(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function sameText(left: string, right: string): boolean {
  return left.localeCompare(right, 'fr', { sensitivity: 'accent' }) === 0;
}

function matchChoice(value: string, choices: string[]): string {
  if (!value) return '';
  return choices.find((choice) => sameText(choice, value)) ?? '';
}

/** Niveau catalogue (Bac, Bac+2, Bac+3, Bac+5) à partir de l’année du profil. */
export function educationLevelFromStudyYear(studyYear: string | null | undefined): string {
  const raw = compact(studyYear).toLowerCase();
  if (!raw) return '';
  const explicit = raw.match(/bac\s*\+\s*(\d)/);
  if (explicit) return `Bac+${explicit[1]}`;
  if (/(?:^|[^a-z0-9])(?:master|m1|m2)(?:[^a-z0-9]|$)/.test(raw)) return 'Bac+5';
  if (/(?:^|[^a-z0-9])(?:licence|l3)(?:[^a-z0-9]|$)/.test(raw)) return 'Bac+3';
  if (/(?:^|[^a-z0-9])(?:bts|dut|but|l1|l2)(?:[^a-z0-9]|$)/.test(raw)) return 'Bac+2';
  if (/(?:^|[^a-z0-9])bac(?:[^a-z0-9+]|$)/.test(raw)) return 'Bac';
  return '';
}

export function domainFromFormation(formation: string | null | undefined, domains: string[]): string {
  const text = compact(formation).toLowerCase();
  if (!text) return '';
  const ranked = [...domains].sort((a, b) => b.length - a.length);
  for (const domain of ranked) {
    const needle = domain.trim().toLowerCase();
    if (needle.length < 4) {
      if (sameText(text, needle)) return domain;
      continue;
    }
    if (text.includes(needle)) return domain;
  }
  return '';
}

export function offerFiltersFromProfile(
  profile: OfferProfileSource,
  facets: OfferProfileFacets
): OfferProfileFilters {
  const location = compact(profile.preferredLocation).slice(0, 80);
  const explicitDomain = matchChoice(compact(profile.preferredDomain), facets.domains);
  const explicitLevel = matchChoice(
    compact(profile.preferredEducationLevel),
    facets.educationLevels
  );
  const inferredLevel = educationLevelFromStudyYear(profile.studyYear);
  const levelFromYear = matchChoice(inferredLevel, facets.educationLevels);

  return {
    location,
    domain: explicitDomain || domainFromFormation(profile.formation, facets.domains),
    educationLevel: explicitLevel || levelFromYear,
  };
}
