import type { Widget } from '@dashboard/shared';
import { GerritChangeList } from './gerrit/GerritChangeList';

interface GerritCustomQueryProps {
  widget: Widget;
}

export function GerritCustomQuery({ widget }: GerritCustomQueryProps) {
  const query = ((widget.config.query as string) || '').replace(/\s+/g, ' ').trim();
  const limit = (widget.config.limit as number) || 10;

  return (
    <GerritChangeList
      widget={widget}
      query={query}
      limit={limit}
      enabled={!!query}
      unconfigured="Configure a query"
      emptyMessage="No changes match this query"
    />
  );
}
