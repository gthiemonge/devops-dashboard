import { useQuery } from '@tanstack/react-query';
import { proxyApi } from '../services/api';
import type { LaunchpadBugStatus } from '@dashboard/shared';

interface UseLaunchpadBugsOptions {
  dataSourceId?: number;
  project: string;
  statuses?: LaunchpadBugStatus[];
  limit?: number;
  sortBy?: 'id' | 'status' | 'importance';
  fetchTags?: boolean;
  refreshInterval?: number;
  enabled?: boolean;
}

export function useLaunchpadBugs(options: UseLaunchpadBugsOptions) {
  return useQuery({
    queryKey: [
      'launchpadBugs',
      options.dataSourceId,
      options.project,
      options.statuses,
      options.limit,
      options.sortBy,
      options.fetchTags,
    ],
    queryFn: () =>
      proxyApi.getLaunchpadBugs({
        dataSourceId: options.dataSourceId,
        project: options.project,
        statuses: options.statuses,
        limit: options.limit,
        sortBy: options.sortBy,
        fetchTags: options.fetchTags,
      }),
    refetchInterval: options.refreshInterval ? options.refreshInterval * 1000 : undefined,
    enabled: options.enabled !== false && !!options.project,
  });
}
