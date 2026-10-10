import type { Widget } from '@dashboard/shared';
import { GerritChangeList } from './gerrit/GerritChangeList';

interface GerritUserChangesProps {
  widget: Widget;
}

export function GerritUserChanges({ widget }: GerritUserChangesProps) {
  const owner = (widget.config.owner as string) || '';
  const limit = (widget.config.limit as number) || 10;
  const additionalQuery = (widget.config.query as string) || '';
  const messageFilter = (widget.config.message as string) || '';

  const baseQuery = owner ? `owner:${owner} status:open` : 'status:open';
  const messageQuery = messageFilter ? `message:${messageFilter}` : '';
  const query = [baseQuery, messageQuery, additionalQuery].filter(Boolean).join(' ');

  return (
    <GerritChangeList
      widget={widget}
      query={query}
      limit={limit}
      enabled={!!owner}
      unconfigured="Configure a username"
      showOwner={false}
      emptyMessage={`No open changes for ${owner}`}
    />
  );
}
