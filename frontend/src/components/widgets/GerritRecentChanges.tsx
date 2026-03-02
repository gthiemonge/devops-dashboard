import { useGerritChanges } from '../../hooks/useGerritChanges';
import type { Widget, GerritChange } from '@dashboard/shared';

interface GerritRecentChangesProps {
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

function getLabelBadge(change: GerritChange, labelName: string): JSX.Element | null {
  const label = change.labels?.[labelName];
  if (!label) return null;

  if (label.approved || (label.value !== undefined && label.value > 0)) {
    return (
      <span className="px-1.5 py-0.5 text-xs rounded bg-green-900/50 text-green-400">
        {labelName === 'Code-Review' ? 'CR+' : 'V+'}
      </span>
    );
  }
  if (label.rejected || (label.value !== undefined && label.value < 0)) {
    return (
      <span className="px-1.5 py-0.5 text-xs rounded bg-red-900/50 text-red-400">
        {labelName === 'Code-Review' ? 'CR-' : 'V-'}
      </span>
    );
  }
  return null;
}

function toGerritProject(project: string): string {
  // If already a regex (starts with ^), use as-is
  if (project.startsWith('^')) return project;
  // Convert glob wildcards to Gerrit regex
  if (project.includes('*')) {
    // Escape regex special chars except *, then convert * to .*
    const escaped = project.replace(/[.+?{}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\*/g, '.*');
    return `^${regex}`;
  }
  return project;
}

function buildProjectQuery(projectInput: string): string {
  const projects = projectInput.split(',').map(p => p.trim()).filter(Boolean);
  if (projects.length === 0) return '';
  const formatted = projects.map(p => `project:${toGerritProject(p)}`);
  if (formatted.length === 1) return formatted[0];
  return `(${formatted.join(' OR ')})`;
}

export function GerritRecentChanges({ widget }: GerritRecentChangesProps) {
  const projectInput = (widget.config.project as string) || 'openstack/octavia';
  const limit = (widget.config.limit as number) || 10;
  const projectQuery = buildProjectQuery(projectInput);
  const query = `${projectQuery} status:open`;

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
    return <div className="text-slate-500 text-sm">No open changes found</div>;
  }

  return (
    <div className="space-y-1">
      {changes.map((change: GerritChange) => (
        <a
          key={change.id}
          href={`https://review.opendev.org/c/${change.project}/+/${change._number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-2 rounded hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 truncate">
                {change.subject}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {change.owner.name || change.owner.username} · {formatDate(change.updated)}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {getLabelBadge(change, 'Code-Review')}
              {getLabelBadge(change, 'Verified')}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
