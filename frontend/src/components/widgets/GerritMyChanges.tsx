import { useEffect, type JSX } from 'react';
import { useGerritChanges } from '../../hooks/useGerritChanges';
import { useDashboardStore } from '../../store/dashboardStore';
import type { Widget, GerritChange } from '@dashboard/shared';

interface GerritMyChangesProps {
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

function getAttentionBadges(change: GerritChange): JSX.Element[] {
  const labels = change.labels || {};
  const badges: JSX.Element[] = [];

  const addBadge = (labelName: string, shortName: string) => {
    const label = labels[labelName];
    if (!label) return;

    // Extract negative vote values
    const negativeVotes = new Set<number>();
    if (label.all && label.all.length > 0) {
      label.all.forEach((vote) => {
        if (typeof vote.value === 'number' && vote.value < 0) {
          negativeVotes.add(vote.value);
        }
      });
    }

    // Fallback to other fields if no negative votes found in 'all'
    if (negativeVotes.size === 0) {
      if (typeof label.value === 'number' && label.value < 0) {
        negativeVotes.add(label.value);
      } else if (label.rejected) {
        negativeVotes.add(labelName === 'Code-Review' ? -2 : -1);
      }
    }

    // Sort by most negative first
    const sortedVotes = Array.from(negativeVotes).sort((a, b) => a - b);

    sortedVotes.forEach((value, idx) => {
      badges.push(
        <span
          key={`${labelName}-${idx}`}
          className="px-1 py-0.5 text-[10px] font-mono font-bold rounded bg-red-500/20 text-red-400 border border-red-500/30"
        >
          {shortName}{value}
        </span>
      );
    });
  };

  addBadge('Code-Review', 'CR');
  addBadge('Verified', 'V');
  addBadge('Workflow', 'W');

  return badges.length > 0 ? badges : [
    <span key="attn" className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
      ATTN
    </span>
  ];
}

export function GerritMyChanges({ widget }: GerritMyChangesProps) {
  const limit = (widget.config.limit as number) || 10;
  const customQuery = widget.config.query as string || '';
  const baseQuery = 'owner:self (label:Code-Review<0 OR label:Verified<0)';
  const query = customQuery ? `${baseQuery} ${customQuery}` : baseQuery;
  const setWidgetIssueCount = useDashboardStore((s) => s.setWidgetIssueCount);

  const { data: changes, isLoading, error } = useGerritChanges({
    dataSourceId: widget.dataSourceId,
    query,
    limit,
    refreshInterval: widget.refreshInterval,
  });

  // Report issue count (changes needing attention)
  useEffect(() => {
    const count = changes?.length || 0;
    setWidgetIssueCount(widget.id, count);
  }, [changes, widget.id, setWidgetIssueCount]);

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
      <div className="flex items-center gap-2 text-emerald-400 text-xs">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="font-mono">All clear</span>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {changes.map((change: GerritChange) => {
        const badges = getAttentionBadges(change);
        return (
          <a
            key={change.id}
            href={`https://review.opendev.org/c/${change.project}/+/${change._number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-2 py-1.5 rounded hover:bg-[#161b22] transition-colors group border-l-2 border-red-500/50 hover:border-red-500"
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
                {badges}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
