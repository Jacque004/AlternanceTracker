import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query/keys';
import { jobOfferService } from '../services/jobOfferService';
import type { JobOfferListParams } from '../services/jobOffers/types';

export function useJobOffers(params: JobOfferListParams) {
  return useQuery({
    queryKey: queryKeys.jobOffers.list(params),
    queryFn: () => jobOfferService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useJobOffer(id: string) {
  return useQuery({
    queryKey: queryKeys.jobOffers.detail(id),
    queryFn: () => jobOfferService.getById(id),
    enabled: id.length > 0,
  });
}

export function useJobOfferFacets() {
  return useQuery({
    queryKey: queryKeys.jobOffers.facets,
    queryFn: () => jobOfferService.facets(),
    staleTime: 5 * 60_000,
  });
}
