import type { NormalizedJobOffer } from '../types.ts';

export interface JobConnectorEnv {
  JOB_OFFERS_ENABLE_MOCK?: string;
  LBA_API_KEY?: string;
  LBA_ROMES?: string;
  LBA_LATITUDE?: string;
  LBA_LONGITUDE?: string;
  LBA_RADIUS?: string;
  FT_CLIENT_ID?: string;
  FT_CLIENT_SECRET?: string;
}

export interface ConnectorFetchResult {
  offers: NormalizedJobOffer[];
  skippedCount: number;
}

export interface JobConnector {
  id: string;
  isEnabled(env: JobConnectorEnv): boolean;
  fetchOffers(env: JobConnectorEnv, fetchImpl?: typeof fetch): Promise<ConnectorFetchResult>;
}
