import { normalizeJob } from '../normalizeJob.ts';
import { studyContractLabel } from '../studyContract.ts';
import type { NormalizedJobOffer } from '../types.ts';
import type { ConnectorFetchResult, JobConnector, JobConnectorEnv } from './types.ts';

/**
 * API officielle Jooble (recherche France).
 * POST https://fr.jooble.org/api/{clé}
 * Un seul appel par collecte. Désactivé tant que JOOBLE_API_KEY est absent.
 *
 * Le quota gratuit est de 500 requêtes au total pour la clé, pas par mois.
 */
export const JOOBLE_SOURCE = 'jooble';
export const JOOBLE_SEARCH_ORIGIN = 'https://fr.jooble.org';

const MISSING_COMPANY = 'Entreprise non précisée';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function textAt(record: Record<string, unknown> | null, key: string): string | undefined {
  const value = record?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function plain(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const text = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text || undefined;
}

/** Jooble envoie parfois 7 décimales, que Date n'accepte pas partout. */
function joobleDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.replace(/(\.\d{3})\d+/, '$1');
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) return trimmed;
  return `${trimmed}Z`;
}

function contractKind(text: string): 'Stage' | 'Alternance' | null {
  const labeled = studyContractLabel(text);
  if (labeled) return labeled;
  if (/\bapprenti/.test(text.toLowerCase())) return 'Alternance';
  return null;
}

function remoteFrom(text: string): boolean | undefined {
  const value = text.toLowerCase();
  if (value.includes('télétravail') || value.includes('teletravail') || value.includes('hybride') || value.includes('remote')) {
    return true;
  }
  return undefined;
}

function resultsPerPage(raw: string | undefined): number {
  const parsed = Number(raw?.trim() || '20');
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(20, Math.max(1, Math.trunc(parsed)));
}

/** Mappe une offre Jooble. Seuls les stages et les alternances sont gardés. */
export function mapJoobleItem(raw: unknown): NormalizedJobOffer | null {
  const item = asRecord(raw);
  if (!item) return null;

  const title = plain(textAt(item, 'title'));
  const type = plain(textAt(item, 'type'));
  const snippet = plain(textAt(item, 'snippet'));
  const contractType = contractKind(`${title ?? ''} ${type ?? ''} ${snippet ?? ''}`);
  if (!contractType) return null;

  const publisher = plain(textAt(item, 'source'));
  const description = [snippet, publisher ? `Origine : ${publisher}.` : undefined].filter(Boolean).join('\n\n');
  const combined = `${title ?? ''} ${snippet ?? ''}`;

  return normalizeJob({
    title,
    companyName: plain(textAt(item, 'company')) ?? MISSING_COMPANY,
    location: plain(textAt(item, 'location')),
    contractType,
    salary: plain(textAt(item, 'salary')),
    remote: remoteFrom(combined),
    description: description || undefined,
    source: JOOBLE_SOURCE,
    sourceUrl: textAt(item, 'link'),
    externalId: textAt(item, 'id'),
    publishedAt: joobleDate(textAt(item, 'updated')),
    isDemo: false,
  });
}

export const joobleConnector: JobConnector = {
  id: JOOBLE_SOURCE,
  isEnabled(env: JobConnectorEnv) {
    return Boolean(env.JOOBLE_API_KEY?.trim());
  },
  async fetchOffers(env: JobConnectorEnv, fetchImpl: typeof fetch = fetch): Promise<ConnectorFetchResult> {
    const key = env.JOOBLE_API_KEY?.trim();
    if (!key) return { offers: [], skippedCount: 0 };

    let response: Response;
    try {
      response = await fetchImpl(`${JOOBLE_SEARCH_ORIGIN}/api/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: env.JOOBLE_KEYWORDS?.trim() || 'alternance',
          location: env.JOOBLE_LOCATION?.trim() || 'France',
          page: 1,
          ResultOnPage: resultsPerPage(env.JOOBLE_RESULTS),
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error('Jooble est injoignable. Aucune offre n\'a été enregistrée.');
    }

    if (!response.ok) {
      throw new Error(`Jooble a répondu ${response.status}. Aucune offre n'a été enregistrée.`);
    }

    const payload = asRecord(await response.json());
    const jobs = payload?.jobs;
    if (!Array.isArray(jobs)) {
      throw new Error('Jooble a renvoyé une réponse inattendue. Aucune offre n\'a été enregistrée.');
    }

    const offers: NormalizedJobOffer[] = [];
    let skippedCount = 0;
    for (const item of jobs) {
      const mapped = mapJoobleItem(item);
      if (mapped) offers.push(mapped);
      else skippedCount += 1;
    }
    return { offers, skippedCount };
  },
};
