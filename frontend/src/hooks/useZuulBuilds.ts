import { useQuery } from '@tanstack/react-query';
import { proxyApi } from '../services/api';

interface UseZuulBuildsOptions {
  dataSourceId?: number;
  project?: string;
  pipeline?: string;
  result?: string;
  results?: string[];
  limit?: number;
  refreshInterval?: number;
  enabled?: boolean;
}

export function useZuulBuilds(options: UseZuulBuildsOptions) {
  return useQuery({
    queryKey: ['zuulBuilds', options.dataSourceId, options.project, options.pipeline, options.result, options.results, options.limit],
    queryFn: () =>
      proxyApi.getZuulBuilds({
        dataSourceId: options.dataSourceId,
        project: options.project,
        pipeline: options.pipeline,
        result: options.result,
        results: options.results,
        limit: options.limit,
      }),
    refetchInterval: options.refreshInterval ? options.refreshInterval * 1000 : undefined,
    enabled: options.enabled !== false,
  });
}
