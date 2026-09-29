import { normalizeJob } from '../normalizeJob.ts';
import { safePublicHttpUrl } from '../sourceUrl.ts';
import { studyContractLabel } from '../studyContract.ts';
import type { NormalizedJobOffer } from '../types.ts';
import type { ConnectorFetchResult, JobConnector, JobConnectorEnv } from './types.ts';

/**
 * API officielle France Travail, Offres d'emploi v2.
 * Jeton OAuth client_credentials, puis recherche.
 * Désactivé tant que l'identifiant client et la clé secrète sont absents.
 */
export const FT_SOURCE = 'france-travail';
const TOKEN_URL = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire';
const SEARCH_URL = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';
const OFFER_PAGE = 'https://candidat.francetravail.fr/offres/recherche/detail/';
const MISSING_COMPANY = 'Entreprise non précisée';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function textAt(record: Record<string, unknown> | null, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function companyName(value: string | undefined): string {
  if (!value) return MISSING_COMPANY;
  if (/confidentiel|anonyme|non communiqu/i.test(value)) return MISSING_COMPANY;
  return value;
}

function contractKind(item: Record<string, unknown>): string | null {
  let kind: 'Stage' | 'Alternance' | null = null;
  if (item.alternance === true) kind = 'Alternance';
  else {
    const nature = `${textAt(item, 'natureContrat') ?? ''} ${textAt(item, 'typeContratLibelle') ?? ''}`;
    const fromNature = studyContractLabel(nature);
    if (fromNature === 'Alternance') kind = 'Alternance';
    else if (fromNature === 'Stage' && !/\b(cdi|cdd|interim|intérim)\b/i.test(nature)) kind = 'Stage';
  }
  if (!kind) return null;
  const code = textAt(item, 'typeContrat') ?? '';
  const label = textAt(item, 'typeContratLibelle') ?? '';
  if (code.toUpperCase() === 'CDD' || /\bCDD\b/i.test(label)) {
    const detail = /\bCDD\b/i.test(label) ? label.trim() : 'CDD';
    return `${kind} · ${detail}`;
  }
  return kind;
}

function formationLabel(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const first = value[0];
  if (typeof first === 'string' && first.trim()) return first;
  const record = asRecord(first);
  return textAt(record, 'niveauLibelle') ?? textAt(record, 'domaineLibelle') ?? textAt(record, 'commentaire');
}

function remoteFrom(item: Record<string, unknown>): boolean | undefined {
  const context = asRecord(item.contexteTravail);
  const text = `${textAt(context, 'horaires') ?? ''} ${textAt(item, 'dureeTravailLibelle') ?? ''}`.toLowerCase();
  if (text.includes('télétravail') || text.includes('teletravail')) return true;
  return undefined;
}

/** Mappe une offre de l'API Offres d'emploi v2. Les formes inattendues sont ignorées. */
export function mapFranceTravailItem(raw: unknown): NormalizedJobOffer | null {
  const item = asRecord(raw);
  const contractType = item ? contractKind(item) : null;
  if (!item || !contractType) return null;
  const id = textAt(item, 'id');
  const workplace = asRecord(item.lieuTravail);
  const company = asRecord(item.entreprise);
  const salary = asRecord(item.salaire);
  const origin = asRecord(item.origineOffre);
  const originUrl = safePublicHttpUrl(textAt(origin, 'urlOrigine'));
  const sourceUrl = originUrl ?? (id ? safePublicHttpUrl(`${OFFER_PAGE}${id}`) : null);

  return normalizeJob({
    title: textAt(item, 'intitule'),
    companyName: companyName(textAt(company, 'nom')),
    location: textAt(workplace, 'libelle'),
    contractType,
    educationLevel: formationLabel(item.formations),
    domain: textAt(item, 'secteurActiviteLibelle') ?? textAt(item, 'romeLibelle'),
    salary: textAt(salary, 'libelle') ?? textAt(salary, 'commentaire'),
    remote: remoteFrom(item),
    description: textAt(item, 'description')?.replace(/<[^>]+>/g, ' '),
    source: FT_SOURCE,
    sourceUrl: sourceUrl ?? undefined,
    externalId: id,
    publishedAt: textAt(item, 'dateCreation'),
    isDemo: false,
  });
}

async function accessToken(env: JobConnectorEnv, fetchImpl: typeof fetch): Promise<string> {
  const clientId = env.FT_CLIENT_ID?.trim();
  const clientSecret = env.FT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error('Identifiants France Travail absents.');

  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'api_offresdemploiv2 o2dsoffre',
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`France Travail a refusé le jeton (${response.status}). Aucune offre n'a été enregistrée.`);
  }
  const payload = asRecord(await response.json());
  const token = textAt(payload, 'access_token');
  if (!token) throw new Error('France Travail n’a pas renvoyé de jeton.');
  return token;
}

export async function fetchFranceTravailPage(
  fetchImpl: typeof fetch,
  token: string,
  start: number
): Promise<{ offers: NormalizedJobOffer[]; skippedCount: number; total: number | null }> {
  const end = start + 149;
  const url = new URL(SEARCH_URL);
  url.searchParams.set('motsCles', 'alternance');
  url.searchParams.set('sort', '2');
  url.searchParams.set('range', `${start}-${end}`);

  const response = await fetchImpl(url.toString(), {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 429) {
    throw new Error('France Travail limite les appels. Aucune offre supplémentaire n’a été enregistrée.');
  }
  if (!response.ok && response.status !== 206) {
    throw new Error(`France Travail a répondu ${response.status}. Aucune offre n'a été enregistrée.`);
  }

  const payload = asRecord(await response.json());
  const items = Array.isArray(payload?.resultats) ? payload.resultats : [];
  const range = response.headers.get('content-range') ?? '';
  const totalMatch = range.match(/\/(\d+)\s*$/);
  const offers: NormalizedJobOffer[] = [];
  let skippedCount = 0;
  for (const item of items) {
    const mapped = mapFranceTravailItem(item);
    if (mapped) offers.push(mapped);
    else skippedCount += 1;
  }
  return {
    offers,
    skippedCount,
    total: totalMatch ? Number(totalMatch[1]) : null,
  };
}

export const franceTravailConnector: JobConnector = {
  id: FT_SOURCE,
  isEnabled(env: JobConnectorEnv) {
    return Boolean(env.FT_CLIENT_ID?.trim() && env.FT_CLIENT_SECRET?.trim());
  },
  async fetchOffers(env: JobConnectorEnv, fetchImpl: typeof fetch = fetch): Promise<ConnectorFetchResult> {
    if (!this.isEnabled(env)) return { offers: [], skippedCount: 0 };
    const token = await accessToken(env, fetchImpl);
    const page = await fetchFranceTravailPage(fetchImpl, token, 0);
    return { offers: page.offers, skippedCount: page.skippedCount };
  },
};
