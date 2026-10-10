import { useQuery } from '@tanstack/react-query';
import { proxyApi } from '../services/api';

/**
 * The authenticated Gerrit account for a data source (null when the backend has no valid
 * credentials). Fetched once per data source and shared by every Gerrit widget.
 */
export function useGerritSelf(dataSourceId?: number) {
  return useQuery({
    queryKey: ['gerritSelf', dataSourceId],
    queryFn: () => proxyApi.getGerritSelf({ dataSourceId }),
    staleTime: Infinity,
    retry: 1,
  });
}
