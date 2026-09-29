import type { NormalizedJobOffer } from './types.ts';
import { safePublicHttpUrl } from './sourceUrl.ts';

const TITLE_MAX = 300;
const COMPANY_MAX = 255;
const TEXT_MAX = 500;
const DESCRIPTION_MAX = 20_000;

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = decodeBasicEntities(value).replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.slice(0, max);
}

function asIso(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

/** Valide et borne une offre déjà ramenée au format commun. Retourne null si elle est inutilisable. */
export function normalizeJob(input: Partial<NormalizedJobOffer>): NormalizedJobOffer | null {
  const title = clean(input.title, TITLE_MAX);
  const companyName = clean(input.companyName, COMPANY_MAX);
  const source = clean(input.source, 80);
  const sourceUrl = safePublicHttpUrl(input.sourceUrl);
  if (!title || !companyName || !source || !sourceUrl) return null;

  const remote = typeof input.remote === 'boolean' ? input.remote : undefined;

  return {
    title,
    companyName,
    location: clean(input.location, TEXT_MAX),
    contractType: clean(input.contractType, 120),
    educationLevel: clean(input.educationLevel, 120),
    domain: clean(input.domain, 120),
    salary: clean(input.salary, 120),
    remote,
    description: clean(input.description, DESCRIPTION_MAX),
    source,
    sourceUrl,
    externalId: clean(input.externalId, 200),
    publishedAt: asIso(input.publishedAt),
    expiresAt: asIso(input.expiresAt),
    isDemo: input.isDemo === true,
  };
}

export function jobFingerprint(offer: {
  companyName: string;
  title: string;
  location?: string | null;
}): string {
  const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${norm(offer.companyName)}|${norm(offer.title)}|${norm(offer.location ?? '')}`;
}

/** Clé d'unicité alignée sur la colonne générée dedupe_key. */
export function dedupeKeyOf(offer: {
  source: string;
  externalId?: string | null;
  sourceUrl: string;
}): string {
  const externalId = offer.externalId?.trim();
  if (externalId) return `${offer.source}\n${externalId}`;
  return `${offer.source}\nurl:${offer.sourceUrl}`;
}
