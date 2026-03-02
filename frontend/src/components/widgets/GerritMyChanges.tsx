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

  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getAttentionReason(change: GerritChange): string {
  const labels = change.labels || {};

  if (labels['Verified']?.rejected || (labels['Verified']?.value !== undefined && labels['Verified'].value < 0)) {
    return 'Failed verification';
  }
  if (labels['Code-Review']?.rejected || (labels['Code-Review']?.value !== undefined && labels['Code-Review'].value < 0)) {
    return 'Negative review';
  }
  return 'Needs attention';
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
    return <div className="text-slate-500 text-sm">Loading changes...</div>;
  }

  if (error) {
    return <div className="text-red-400 text-sm">Error: {(error as Error).message}</div>;
  }

  if (!changes || changes.length === 0) {
    return (
      <div className="text-green-400 text-sm flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        No changes need attention
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {changes.map((change: GerritChange) => (
        <a
          key={change.id}
          href={`https://review.opendev.org/c/${change.project}/+/${change._number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-2 rounded hover:bg-slate-700/50 transition-colors border-l-2 border-red-500"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 truncate">
              {change.subject}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-red-400">
                {getAttentionReason(change)}
              </span>
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs text-slate-500">
                {formatDate(change.updated)}
              </span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
