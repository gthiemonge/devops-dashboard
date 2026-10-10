import type { Widget } from '@dashboard/shared';
import { GerritChangeList } from './gerrit/GerritChangeList';

interface GerritMyChangesProps {
  widget: Widget;
}

/** My open changes with a negative Code-Review or Verified vote: every row needs action. */
export function GerritMyChanges({ widget }: GerritMyChangesProps) {
  const limit = (widget.config.limit as number) || 10;
  const customQuery = (widget.config.query as string) || '';
  const baseQuery = 'owner:self status:open (label:Code-Review<0 OR label:Verified<0)';
  const query = customQuery ? `${baseQuery} ${customQuery}` : baseQuery;

  return (
    <GerritChangeList
      widget={widget}
      query={query}
      limit={limit}
      showOwner={false}
      allRowsActionable
      emptyTone="ok"
      emptyMessage="None of your changes has a negative vote"
    />
  );
}
