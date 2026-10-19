/**
 * Une offre est retenue seulement si l'employeur qui la publie est une entreprise.
 * Les CFA, lycées, écoles et organismes de formation sont écartés.
 * Les auto-écoles qui recrutent un enseignant de la conduite restent : ce sont des entreprises.
 */

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** NAF section 85, sauf la conduite (85.53) et le sport (85.51). */
export function isEducationActivity(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const compact = value.replace(/[\s.]/g, '').toUpperCase();
  if (/^85/.test(compact)) {
    if (/^8553/.test(compact) || /^8551/.test(compact)) return false;
    if (/^85(\d{2})?/.test(compact)) return true;
  }

  const text = fold(value);
  return /formation continue d['’]adultes|autres enseignements|enseignement primaire|enseignement secondaire|enseignement superieur|enseignement post-secondaire|enseignement culturel|activites de soutien a l['’]enseignement/.test(
    text
  );
}

const SCHOOL_NAME =
  /\bcfa[a-z]?\b|\bafpa\b|\bgreta\b|\blycee\b|\buniversite\b|\biut\b|\bmfr\b|\bformasup\b|\bifria\b|\bogec\b|\besad\b|maison familiale|centre de formation|organisme de formation|institut de formation|institut des metiers|\bformations?\b|\becole\b|business school|\bschool\b|\bacadem|\beducation\b|\bcampus\b|^(groupe\s+)?alternance\b/i;

/** Nom d'un CFA, d'une école ou d'un organisme de formation, pas d'une entreprise. */
export function isSchoolPublisherName(name: string | null | undefined): boolean {
  if (!name?.trim()) return false;
  const text = fold(name);
  if (/\bauto[-\s]?ecoles?\b/.test(text)) return false;
  return SCHOOL_NAME.test(text);
}

export function isSchoolPublishedOffer(input: {
  companyName?: string | null;
  domain?: string | null;
  activity?: string | null;
}): boolean {
  const activityText = fold(`${input.domain ?? ''} ${input.activity ?? ''}`);
  if (/enseignement de la conduite/.test(activityText)) return false;
  const name = fold(input.companyName ?? '');
  if (/\bauto[-\s]?ecoles?\b/.test(name) || /\becole de conduite\b/.test(name)) return false;
  return (
    isSchoolPublisherName(input.companyName) ||
    isEducationActivity(input.domain) ||
    isEducationActivity(input.activity)
  );
}
