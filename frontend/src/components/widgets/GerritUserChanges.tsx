import type { JSX } from 'react';
import { useGerritChanges } from '../../hooks/useGerritChanges';
import type { Widget, GerritChange } from '@dashboard/shared';

interface GerritUserChangesProps {
  widget: Widget;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'now';
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getLabelBadges(change: GerritChange, labelName: string): JSX.Element[] {
  const label = change.labels?.[labelName];
  if (!label) return [];

  const shortName = labelName === 'Code-Review' ? 'CR' : labelName === 'Verified' ? 'V' : 'W';
  const badges: JSX.Element[] = [];

  // Extract unique vote values from the 'all' array
  const voteValues = new Set<number>();
  if (label.all && label.all.length > 0) {
    label.all.forEach((vote) => {
      if (typeof vote.value === 'number' && vote.value !== 0) {
        voteValues.add(vote.value);
      }
    });
  }

  // Fallback to other fields if no votes found in 'all'
  if (voteValues.size === 0) {
    if (typeof label.value === 'number' && label.value !== 0) {
      voteValues.add(label.value);
    } else if (label.approved) {
      voteValues.add(labelName === 'Code-Review' ? 2 : 1);
    } else if (label.rejected) {
      voteValues.add(labelName === 'Code-Review' ? -2 : -1);
    }
  }

  // Sort votes: positive descending, then negative ascending
  const sortedVotes = Array.from(voteValues).sort((a, b) => {
    if (a > 0 && b > 0) return b - a;
    if (a < 0 && b < 0) return a - b;
    return b - a;
  });

  sortedVotes.forEach((value, idx) => {
    const isPositive = value > 0;
    const valueStr = value > 0 ? `+${value}` : `${value}`;
    badges.push(
      <span
        key={`${labelName}-${idx}`}
        className={`px-1 py-0.5 text-[10px] font-mono font-bold rounded border ${
          isPositive
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : 'bg-red-500/20 text-red-400 border-red-500/30'
        }`}
      >
        {shortName}{valueStr}
      </span>
    );
  });

  return badges;
}

export function GerritUserChanges({ widget }: GerritUserChangesProps) {
  const owner = (widget.config.owner as string) || '';
  const limit = (widget.config.limit as number) || 10;
  const additionalQuery = (widget.config.query as string) || '';
  const messageFilter = (widget.config.message as string) || '';

  const baseQuery = owner ? `owner:${owner} status:open` : 'status:open';
  const messageQuery = messageFilter ? `message:${messageFilter}` : '';
  const queryParts = [baseQuery, messageQuery, additionalQuery].filter(Boolean);
  const query = queryParts.join(' ');

  const { data: changes, isLoading, error } = useGerritChanges({
    dataSourceId: widget.dataSourceId,
    query,
    limit,
    refreshInterval: widget.refreshInterval,
    enabled: !!owner,
  });

  if (!owner) {
    return (
      <div className="text-[#7d8590] text-xs font-mono">Configure a username</div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[#7d8590] text-xs">
        <div className="w-3 h-3 border border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="font-mono">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-xs">
        <span className="font-mono">Error: {(error as Error).message}</span>
      </div>
    );
  }

  if (!changes || changes.length === 0) {
    return (
      <div className="text-[#7d8590] text-xs font-mono">No open changes for {owner}</div>
    );
  }

  return (
    <div className="space-y-0.5">
      {changes.map((change: GerritChange) => (
        <a
          key={change.id}
          href={`https://review.opendev.org/c/${change.project}/+/${change._number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-2 py-1.5 rounded hover:bg-[#161b22] transition-colors group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#e6edf3] truncate group-hover:text-cyan-400 transition-colors">
                {change.subject}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono text-emerald-400/70">
                  {change._number}
                </span>
                <span className="text-[#484f58]">·</span>
                <span className="text-[10px] font-mono text-cyan-400/70">
                  {change.project.replace('openstack/', '')}
                </span>
                <span className="text-[#484f58]">·</span>
                <span className="text-[10px] text-[#484f58] font-mono">
                  {formatDate(change.updated)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {getLabelBadges(change, 'Code-Review')}
              {getLabelBadges(change, 'Verified')}
              {getLabelBadges(change, 'Workflow')}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
