import { sourceLabel } from './types.ts';

export const MAX_JOB_ALERTS = 10;

export interface JobAlertCriteria {
  keywords: string | null;
  location: string | null;
  domain: string | null;
  educationLevel: string | null;
  contract: 'stage' | 'alternance' | null;
  remote: 'yes' | 'no' | null;
  source: string | null;
}

export interface AlertMatchOffer {
  title: string;
  companyName: string;
  location?: string | null;
  contractType?: string | null;
  educationLevel?: string | null;
  domain?: string | null;
  description?: string | null;
  remote?: boolean | null;
  source: string;
  status: 'active' | 'expired';
  isDemo: boolean;
}

/** Même nettoyage que la recherche du catalogue : pas de jokers SQL. */
export function plainSearchTerm(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[%*,().]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 80);
}

function exactTerm(raw: string | null | undefined, max: number): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, max);
}

export function normalizeJobAlertCriteria(input: {
  keywords?: string | null;
  location?: string | null;
  domain?: string | null;
  educationLevel?: string | null;
  contract?: string | null;
  remote?: string | null;
  source?: string | null;
}): JobAlertCriteria {
  const contract = input.contract === 'stage' || input.contract === 'alternance' ? input.contract : null;
  const remote = input.remote === 'yes' || input.remote === 'no' ? input.remote : null;
  return {
    keywords: plainSearchTerm(input.keywords),
    location: plainSearchTerm(input.location),
    domain: exactTerm(input.domain, 120),
    educationLevel: exactTerm(input.educationLevel, 80),
    contract,
    remote,
    source: exactTerm(input.source, 80),
  };
}

export function hasJobAlertCriteria(alert: JobAlertCriteria): boolean {
  return Boolean(
    alert.keywords ||
      alert.location ||
      alert.domain ||
      alert.educationLevel ||
      alert.contract ||
      alert.remote ||
      alert.source
  );
}

function fold(value: string | null): string {
  return (value ?? '').toLocaleLowerCase('fr');
}

export function sameJobAlertCriteria(left: JobAlertCriteria, right: JobAlertCriteria): boolean {
  return (
    fold(left.keywords) === fold(right.keywords) &&
    fold(left.location) === fold(right.location) &&
    fold(left.domain) === fold(right.domain) &&
    fold(left.educationLevel) === fold(right.educationLevel) &&
    left.contract === right.contract &&
    left.remote === right.remote &&
    fold(left.source) === fold(right.source)
  );
}

export function jobAlertLabel(alert: JobAlertCriteria): string {
  const parts: string[] = [];
  if (alert.keywords) parts.push(alert.keywords);
  if (alert.location) parts.push(alert.location);
  if (alert.domain) parts.push(alert.domain);
  if (alert.educationLevel) parts.push(alert.educationLevel);
  if (alert.contract === 'stage') parts.push('Stage');
  if (alert.contract === 'alternance') parts.push('Alternance');
  if (alert.remote === 'yes') parts.push('Télétravail');
  if (alert.remote === 'no') parts.push('Sur site');
  if (alert.source) parts.push(sourceLabel(alert.source));
  const label = parts.join(' · ').trim();
  return (label || 'Alerte offres').slice(0, 120);
}

/** Chemin du catalogue filtré comme l’alerte. */
export function jobAlertResultsPath(alert: JobAlertCriteria): string {
  const params = new URLSearchParams();
  if (alert.keywords) params.set('q', alert.keywords);
  if (alert.location) params.set('location', alert.location);
  if (alert.domain) params.set('domain', alert.domain);
  if (alert.educationLevel) params.set('education', alert.educationLevel);
  if (alert.remote) params.set('remote', alert.remote);
  if (alert.contract) params.set('contrat', alert.contract);
  if (alert.source) params.set('source', alert.source);
  const query = params.toString();
  return query ? `/offres?${query}` : '/offres';
}

function includesFold(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack) return false;
  return haystack.toLocaleLowerCase('fr').includes(needle.toLocaleLowerCase('fr'));
}

function contractKind(contractType: string | null | undefined): 'stage' | 'alternance' | null {
  const value = (contractType ?? '').trim().toLocaleLowerCase('fr');
  if (value.startsWith('stage')) return 'stage';
  if (value.startsWith('alternance')) return 'alternance';
  return null;
}

/** Même règles que le catalogue : stage ou alternance, hors démonstration, hors offre expirée. */
export function offerMatchesAlert(offer: AlertMatchOffer, alert: JobAlertCriteria): boolean {
  if (offer.status !== 'active' || offer.isDemo) return false;
  if (!hasJobAlertCriteria(alert)) return false;

  if (alert.keywords) {
    const hit =
      includesFold(offer.title, alert.keywords) ||
      includesFold(offer.companyName, alert.keywords) ||
      includesFold(offer.description, alert.keywords) ||
      includesFold(offer.domain, alert.keywords);
    if (!hit) return false;
  }

  if (alert.location && !includesFold(offer.location, alert.location)) return false;
  if (alert.domain && offer.domain !== alert.domain) return false;
  if (alert.educationLevel && offer.educationLevel !== alert.educationLevel) return false;
  if (alert.source && offer.source !== alert.source) return false;
  if (alert.remote === 'yes' && offer.remote !== true) return false;
  if (alert.remote === 'no' && offer.remote !== false) return false;

  const kind = contractKind(offer.contractType);
  if (alert.contract) return kind === alert.contract;
  return kind !== null;
}
