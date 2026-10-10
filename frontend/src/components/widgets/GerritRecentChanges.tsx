import type { Widget } from '@dashboard/shared';
import { GerritChangeList } from './gerrit/GerritChangeList';
import { buildBranchQuery, buildProjectQuery } from './gerrit/query';

interface GerritRecentChangesProps {
  widget: Widget;
}

export function GerritRecentChanges({ widget }: GerritRecentChangesProps) {
  const projectInput = (widget.config.project as string) || 'openstack/octavia';
  const branchInput = (widget.config.branch as string) || '';
  const messageFilter = (widget.config.message as string) || '';
  const limit = (widget.config.limit as number) || 10;
  const messageQuery = messageFilter ? `message:${messageFilter}` : '';
  const query = [buildProjectQuery(projectInput), buildBranchQuery(branchInput), messageQuery, 'status:open']
    .filter(Boolean)
    .join(' ');

  return <GerritChangeList widget={widget} query={query} limit={limit} emptyMessage="No open changes" />;
}
