import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function invalidateApplicationCaches() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['applications'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);
}
