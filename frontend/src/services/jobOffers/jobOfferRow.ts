import { jobFingerprint } from './normalizeJob.ts';
import type { NormalizedJobOffer } from './types.ts';

/** Ligne à upsert. dedupe_key est calculée en base, ne pas l'envoyer. */
export function toJobOfferRow(offer: NormalizedJobOffer) {
  return {
    title: offer.title,
    company_name: offer.companyName,
    location: offer.location ?? null,
    contract_type: offer.contractType ?? null,
    education_level: offer.educationLevel ?? null,
    domain: offer.domain ?? null,
    salary: offer.salary ?? null,
    remote: offer.remote ?? null,
    description: offer.description ?? null,
    source: offer.source,
    source_url: offer.sourceUrl,
    external_id: offer.externalId ?? null,
    published_at: offer.publishedAt ?? null,
    expires_at: offer.expiresAt ?? null,
    status: 'active' as const,
    is_demo: offer.isDemo,
    fingerprint: jobFingerprint(offer),
  };
}
