import { useQuery } from '@tanstack/react-query';
import { proxyApi } from '../services/api';

interface UseGerritChangesOptions {
  dataSourceId?: number;
  query: string;
  limit?: number;
  refreshInterval?: number;
  enabled?: boolean;
}

export function useGerritChanges(options: UseGerritChangesOptions) {
  return useQuery({
    queryKey: ['gerritChanges', options.dataSourceId, options.query, options.limit],
    queryFn: () =>
      proxyApi.getGerritChanges({
        dataSourceId: options.dataSourceId,
        q: options.query,
        n: options.limit,
      }),
    refetchInterval: options.refreshInterval ? options.refreshInterval * 1000 : undefined,
    enabled: options.enabled !== false,
  });
}
