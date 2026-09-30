/** Offre normalisée, commune à tous les connecteurs. */
export interface NormalizedJobOffer {
  title: string;
  companyName: string;
  location?: string;
  contractType?: string;
  educationLevel?: string;
  domain?: string;
  salary?: string;
  remote?: boolean;
  description?: string;
  source: string;
  sourceUrl: string;
  externalId?: string;
  publishedAt?: string;
  expiresAt?: string;
  /** Vrai seulement pour des données de développement, jamais pour une source réelle. */
  isDemo: boolean;
}

export interface JobOffer {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  contractType: string | null;
  educationLevel: string | null;
  domain: string | null;
  salary: string | null;
  remote: boolean | null;
  description: string | null;
  source: string;
  sourceUrl: string;
  externalId: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  status: 'active' | 'expired';
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobOfferListParams {
  search?: string;
  location?: string;
  domain?: string;
  educationLevel?: string;
  remote?: '' | 'yes' | 'no';
  /** Vide = stage et alternance. */
  contract?: '' | 'stage' | 'alternance';
  /** Jours : 1, 7 ou 30. Vide = toutes les dates. */
  publishedWithin?: '' | '1' | '7' | '30';
  source?: string;
  page?: number;
}

export interface JobOffersPage {
  data: JobOffer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface JobOfferFacets {
  domains: string[];
  educationLevels: string[];
  sources: string[];
}

export interface JobOfferAdminSource {
  source: string;
  activeCount: number;
}

export interface JobOfferCollectionRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'error';
  sources: string[];
  fetched_count: number;
  inserted_count: number;
  updated_count: number;
  duplicate_count: number;
  skipped_count: number;
  expired_count: number;
  error_message: string | null;
}

export interface JobOfferAdminStats {
  activeCount: number;
  demoCount: number;
  expiredCount: number;
  clicksLast7Days: number;
  sources: JobOfferAdminSource[];
  lastRun: JobOfferCollectionRun | null;
}

export const JOB_OFFERS_PAGE_SIZE = 20;

export const SOURCE_LABELS: Record<string, string> = {
  'mock-dev': 'Démonstration',
  'la-bonne-alternance': 'La bonne alternance',
  'france-travail': 'France Travail',
};

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}
