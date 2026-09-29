import { dedupeKeyOf, jobFingerprint } from './normalizeJob.ts';
import type { NormalizedJobOffer } from './types.ts';

export interface DedupeResult {
  unique: NormalizedJobOffer[];
  duplicateCount: number;
}

/**
 * 1. source + external_id
 * 2. source + source_url
 * 3. entreprise + titre + lieu
 */
export function deduplicateJobs(offers: NormalizedJobOffer[]): DedupeResult {
  const seenKeys = new Set<string>();
  const seenFingerprints = new Set<string>();
  const unique: NormalizedJobOffer[] = [];
  let duplicateCount = 0;

  for (const offer of offers) {
    const key = dedupeKeyOf(offer);
    const urlKey = `url:${offer.source}\n${offer.sourceUrl}`;
    const fingerprint = jobFingerprint(offer);
    if (seenKeys.has(key) || seenKeys.has(urlKey) || seenFingerprints.has(fingerprint)) {
      duplicateCount += 1;
      continue;
    }
    seenKeys.add(key);
    seenKeys.add(urlKey);
    seenFingerprints.add(fingerprint);
    unique.push(offer);
  }

  return { unique, duplicateCount };
}

export interface UpsertSplit {
  toUpsert: NormalizedJobOffer[];
  insertedCount: number;
  updatedCount: number;
  duplicateCount: number;
}

/**
 * Compare un lot déjà dédupliqué au contenu de job_offers.
 * Un fingerprint déjà présent sous une autre clé est un doublon, pas une nouvelle ligne.
 */
export function splitOffersForUpsert(
  offers: NormalizedJobOffer[],
  existingByKey: ReadonlyMap<string, string>,
  fingerprintOwners: ReadonlyMap<string, string>,
  existingUrls: ReadonlyMap<string, string> = new Map()
): UpsertSplit {
  const toUpsert: NormalizedJobOffer[] = [];
  let insertedCount = 0;
  let updatedCount = 0;
  let duplicateCount = 0;

  for (const offer of offers) {
    const key = dedupeKeyOf(offer);
    const fingerprint = jobFingerprint(offer);
    const urlOwner = existingUrls.get(`${offer.source}\n${offer.sourceUrl}`);
    if (existingByKey.has(key)) {
      toUpsert.push(offer);
      updatedCount += 1;
      continue;
    }
    if ((urlOwner && urlOwner !== key) || (fingerprintOwners.get(fingerprint) && fingerprintOwners.get(fingerprint) !== key)) {
      duplicateCount += 1;
      continue;
    }
    toUpsert.push(offer);
    insertedCount += 1;
  }

  return { toUpsert, insertedCount, updatedCount, duplicateCount };
}
