import { normalizeJob } from '../normalizeJob.ts';
import { studyContractLabel } from '../studyContract.ts';
import type { NormalizedJobOffer } from '../types.ts';
import type { ConnectorFetchResult, JobConnector, JobConnectorEnv } from './types.ts';

/**
 * API officielle La bonne alternance (Ministère du Travail / beta.gouv.fr).
 * GET https://api.apprentissage.beta.gouv.fr/api/job/v1/search
 * Authentification : jeton créé sur l'espace développeurs (Authorization: Bearer).
 * Un seul appel par collecte. Désactivé tant que LBA_API_KEY est absent.
 *
 * Usage gratuit réservé aux usages non lucratifs par l'éditeur de l'API.
 * La revente ou la facturation de l'accès aux candidats est interdite.
 */
export const LBA_SOURCE = 'la-bonne-alternance';
export const LBA_SEARCH_URL = 'https://api.apprentissage.beta.gouv.fr/api/job/v1/search';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function textAt(record: Record<string, unknown> | null, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function nested(record: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  return asRecord(record?.[key]);
}

export function extractOfferItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (!root) return [];
  for (const key of ['jobs', 'results', 'offers', 'items', 'data']) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
  }
  const nestedLists: unknown[] = [];
  for (const value of Object.values(root)) {
    const child = asRecord(value);
    if (child && Array.isArray(child.results)) nestedLists.push(...child.results);
  }
  return nestedLists;
}

const MISSING_COMPANY = 'Entreprise non précisée';

const ROME_DOMAINS: Record<string, string> = {
  M1802: 'Informatique',
  M1805: 'Informatique',
  M1806: 'Informatique',
  M1810: 'Informatique',
  M1203: 'Gestion',
  M1607: 'Gestion',
  M1501: 'Ressources humaines',
  D1401: 'Commerce',
  D1402: 'Commerce',
  D1507: 'Commerce',
  E1103: 'Communication',
};

function identifierOf(item: Record<string, unknown>): string | undefined {
  const raw = item.identifier ?? item.id;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return textAt(asRecord(raw), 'id');
}

function labelOf(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  const record = asRecord(value);
  return textAt(record, 'label') ?? textAt(record, 'libelle') ?? textAt(record, 'name');
}

function romeDomain(codes: unknown): string | undefined {
  const list = Array.isArray(codes) ? codes : typeof codes === 'string' ? [codes] : [];
  for (const code of list) {
    if (typeof code !== 'string') continue;
    const domain = ROME_DOMAINS[code.trim().toUpperCase()];
    if (domain) return domain;
  }
  return undefined;
}

function joinContract(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const parts = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    if (parts.length) return parts.join(', ');
  }
  return undefined;
}

function remoteFrom(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const text = value.toLowerCase();
  if (text.includes('télétravail') || text.includes('teletravail') || text.includes('hybride') || text.includes('remote')) {
    return true;
  }
  if (text.includes('présentiel') || text.includes('presentiel') || text.includes('sur site')) return false;
  return undefined;
}

/** Mappe un objet de l'API documentée. Les formes inattendues sont ignorées par normalizeJob. */
export function mapLaBonneAlternanceItem(raw: unknown): NormalizedJobOffer | null {
  const item = asRecord(raw);
  if (!item) return null;
  const offer = nested(item, 'offer') ?? nested(item, 'job') ?? item;
  const workplace = nested(item, 'workplace') ?? nested(item, 'company');
  const contract = nested(item, 'contract');
  const apply = nested(item, 'apply') ?? nested(item, 'contact');
  const location = nested(item, 'location') ?? nested(workplace, 'location');
  const partner = nested(item, 'partner');

  const publication = nested(offer, 'publication');
  const status = textAt(offer, 'status');
  if (status && !/^(active|actif)$/i.test(status)) return null;

  const city = textAt(location, 'city') ?? textAt(location, 'address') ?? textAt(item, 'location');
  const diploma =
    textAt(offer, 'target_diploma_label') ??
    labelOf(offer.target_diploma) ??
    textAt(offer, 'diploma') ??
    textAt(item, 'educationLevel');

  return normalizeJob({
    title: textAt(offer, 'title') ?? textAt(offer, 'intitule') ?? textAt(item, 'title'),
    companyName:
      textAt(workplace, 'name') ??
      textAt(workplace, 'brand') ??
      textAt(workplace, 'legal_name') ??
      textAt(item, 'companyName') ??
      textAt(partner, 'name') ??
      MISSING_COMPANY,
    location: city,
    contractType:
      studyContractLabel(joinContract(contract?.type) ?? textAt(item, 'contractType')) ?? 'Alternance',
    educationLevel: diploma,
    domain:
      textAt(nested(item, 'domain'), 'label') ??
      textAt(offer, 'rome_label') ??
      romeDomain(offer.rome_codes) ??
      textAt(item, 'domain'),
    salary: textAt(offer, 'salary') ?? textAt(contract, 'salary'),
    remote: remoteFrom(contract?.remote ?? contract?.workplace_mode ?? offer.remote),
    description: textAt(offer, 'description') ?? textAt(item, 'description'),
    source: LBA_SOURCE,
    sourceUrl: textAt(apply, 'url') ?? textAt(item, 'url') ?? textAt(item, 'sourceUrl'),
    externalId: identifierOf(item) ?? textAt(offer, 'identifier'),
    publishedAt:
      textAt(publication, 'creation') ??
      textAt(offer, 'creation') ??
      textAt(item, 'created_at') ??
      textAt(item, 'publishedAt'),
    expiresAt: textAt(publication, 'expiration') ?? textAt(offer, 'expiration') ?? textAt(item, 'expiresAt'),
    isDemo: false,
  });
}

export const laBonneAlternanceConnector: JobConnector = {
  id: LBA_SOURCE,
  isEnabled(env: JobConnectorEnv) {
    return Boolean(env.LBA_API_KEY?.trim());
  },
  async fetchOffers(env: JobConnectorEnv, fetchImpl: typeof fetch = fetch): Promise<ConnectorFetchResult> {
    const key = env.LBA_API_KEY?.trim();
    if (!key) return { offers: [], skippedCount: 0 };

    const url = new URL(LBA_SEARCH_URL);
    url.searchParams.set('romes', env.LBA_ROMES?.trim() || 'M1805');
    url.searchParams.set('caller', 'alternancetracker');
    if (env.LBA_LATITUDE?.trim() && env.LBA_LONGITUDE?.trim()) {
      url.searchParams.set('latitude', env.LBA_LATITUDE.trim());
      url.searchParams.set('longitude', env.LBA_LONGITUDE.trim());
      url.searchParams.set('radius', env.LBA_RADIUS?.trim() || '30');
    }

    const response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`La bonne alternance a répondu ${response.status}. Aucune offre n'a été enregistrée.`);
    }

    const payload: unknown = await response.json();
    const items = extractOfferItems(payload);
    const offers: NormalizedJobOffer[] = [];
    let skippedCount = 0;
    for (const item of items) {
      const mapped = mapLaBonneAlternanceItem(item);
      if (mapped) offers.push(mapped);
      else skippedCount += 1;
    }
    return { offers, skippedCount };
  },
};
