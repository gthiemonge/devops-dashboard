import { useGerritChanges } from '../../hooks/useGerritChanges';
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

function getAttentionReason(change: GerritChange): { text: string; color: string } {
  const labels = change.labels || {};

  if (labels['Verified']?.rejected || (labels['Verified']?.value !== undefined && labels['Verified'].value < 0)) {
    return { text: 'V-', color: 'text-red-400' };
  }
  if (labels['Code-Review']?.rejected || (labels['Code-Review']?.value !== undefined && labels['Code-Review'].value < 0)) {
    return { text: 'CR-', color: 'text-amber-400' };
  }
  return { text: 'ATTN', color: 'text-amber-400' };
}

export function GerritMyChanges({ widget }: GerritMyChangesProps) {
  const limit = (widget.config.limit as number) || 10;
  const customQuery = widget.config.query as string || '';
  const baseQuery = 'owner:self (label:Code-Review<0 OR label:Verified<0)';
  const query = customQuery ? `${baseQuery} ${customQuery}` : baseQuery;

  const { data: changes, isLoading, error } = useGerritChanges({
    dataSourceId: widget.dataSourceId,
    query,
    limit,
    refreshInterval: widget.refreshInterval,
  });

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
        const reason = getAttentionReason(change);
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
                  <span className="text-[10px] font-mono text-cyan-400/70">
                    {change.project.replace('openstack/', '')}
                  </span>
                  <span className="text-[#484f58]">·</span>
                  <span className="text-[10px] text-[#484f58] font-mono">
                    {formatDate(change.updated)}
                  </span>
                </div>
              </div>
              <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-red-500/20 border border-red-500/30 ${reason.color}`}>
                {reason.text}
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
