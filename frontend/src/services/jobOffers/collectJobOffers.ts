import { deduplicateJobs } from './deduplicateJobs.ts';
import { franceTravailConnector } from './connectors/franceTravailConnector.ts';
import { laBonneAlternanceConnector } from './connectors/laBonneAlternanceConnector.ts';
import { mockConnector } from './connectors/mockConnector.ts';
import type { JobConnector, JobConnectorEnv } from './connectors/types.ts';
import type { NormalizedJobOffer } from './types.ts';

const CONNECTORS: JobConnector[] = [laBonneAlternanceConnector, franceTravailConnector, mockConnector];

export interface CollectPlan {
  offers: NormalizedJobOffer[];
  fetchedCount: number;
  duplicateCount: number;
  skippedCount: number;
  sources: string[];
  error?: string;
  warnings?: string[];
}

/** Connecteurs autorisés uniquement. Le frontend de lecture n'appelle pas cette fonction. */
export async function collectJobOffers(
  env: JobConnectorEnv,
  fetchImpl?: typeof fetch
): Promise<CollectPlan> {
  const enabled = CONNECTORS.filter((connector) => connector.isEnabled(env));
  if (enabled.length === 0) {
    return {
      offers: [],
      fetchedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      sources: [],
      error:
        'Aucun connecteur activé. Définissez LBA_API_KEY pour La bonne alternance, ou JOB_OFFERS_ENABLE_MOCK=true uniquement en développement.',
    };
  }

  const collected: NormalizedJobOffer[] = [];
  let skippedCount = 0;
  const sources: string[] = [];
  const errors: string[] = [];

  for (const connector of enabled) {
    sources.push(connector.id);
    try {
      const result = await connector.fetchOffers(env, fetchImpl);
      collected.push(...result.offers);
      skippedCount += result.skippedCount;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de collecte';
      errors.push(message.slice(0, 300));
    }
  }

  const { unique, duplicateCount } = deduplicateJobs(collected);
  const plan: CollectPlan = {
    offers: unique,
    fetchedCount: collected.length + skippedCount,
    duplicateCount,
    skippedCount,
    sources,
  };
  if (errors.length > 0 && unique.length === 0) {
    plan.error = errors.join(' ');
  } else if (errors.length > 0) {
    plan.warnings = errors;
  }
  return plan;
}
