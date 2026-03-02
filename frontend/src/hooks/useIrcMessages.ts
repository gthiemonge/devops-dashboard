import { useQuery } from '@tanstack/react-query';
import { proxyApi } from '../services/api';

interface UseIrcMessagesOptions {
  dataSourceId?: number;
  channel: string;
  limit?: number;
  refreshInterval?: number;
  enabled?: boolean;
}

export function useIrcMessages(options: UseIrcMessagesOptions) {
  return useQuery({
    queryKey: ['ircMessages', options.dataSourceId, options.channel, options.limit],
    queryFn: () =>
      proxyApi.getIrcMessages({
        dataSourceId: options.dataSourceId,
        channel: options.channel,
        limit: options.limit,
      }),
    refetchInterval: options.refreshInterval ? options.refreshInterval * 1000 : undefined,
    enabled: options.enabled !== false && !!options.channel,
  });
}
