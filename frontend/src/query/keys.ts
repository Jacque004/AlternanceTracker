import type { ApplicationListParams } from '../types';
import type { JobOfferListParams } from '../services/jobOffers/types';

export const queryKeys = {
  applications: {
    all: ['applications'] as const,
    list: (params: ApplicationListParams = {}) => ['applications', 'list', params] as const,
    detail: (id: number) => ['applications', 'detail', id] as const,
    events: (id: number) => ['applications', 'events', id] as const,
    interviewPrep: (id: number) => ['applications', 'interview-prep', id] as const,
    interviewPreps: (ids: number[]) => ['applications', 'interview-preps', ids] as const,
  },
  jobOffers: {
    all: ['job-offers'] as const,
    list: (params: JobOfferListParams) => ['job-offers', 'list', params] as const,
    detail: (id: string) => ['job-offers', 'detail', id] as const,
    facets: ['job-offers', 'facets'] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    recent: ['dashboard', 'recent'] as const,
    upcoming: ['dashboard', 'upcoming'] as const,
  },
};
