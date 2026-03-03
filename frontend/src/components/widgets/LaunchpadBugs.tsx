import { useEffect } from 'react';
import { useLaunchpadBugs } from '../../hooks/useLaunchpadBugs';
import { useDashboardStore } from '../../store/dashboardStore';
import type { Widget, LaunchpadBugWithTask, LaunchpadBugStatus, LaunchpadBugImportance } from '@dashboard/shared';

interface LaunchpadBugsProps {
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

function getImportanceColor(importance: LaunchpadBugImportance): string {
  switch (importance) {
    case 'Critical':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'High':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'Medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Low':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Wishlist':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

function getStatusColor(status: LaunchpadBugStatus): string {
  switch (status) {
    case 'In Progress':
      return 'text-cyan-400';
    case 'Triaged':
      return 'text-blue-400';
    case 'Confirmed':
      return 'text-yellow-400';
    case 'New':
      return 'text-orange-400';
    case 'Incomplete':
      return 'text-gray-400';
    case 'Fix Committed':
      return 'text-green-400';
    case 'Fix Released':
      return 'text-emerald-400';
    default:
      return 'text-gray-400';
  }
}

function getBorderColor(importance: LaunchpadBugImportance): string {
  switch (importance) {
    case 'Critical':
      return 'border-red-500/50 hover:border-red-500';
    case 'High':
      return 'border-orange-500/50 hover:border-orange-500';
    case 'Medium':
      return 'border-yellow-500/50 hover:border-yellow-500';
    case 'Low':
      return 'border-blue-500/50 hover:border-blue-500';
    default:
      return 'border-gray-500/50 hover:border-gray-500';
  }
}

export function LaunchpadBugs({ widget }: LaunchpadBugsProps) {
  const project = widget.config.project as string;
  const limit = (widget.config.limit as number) || 10;
  const statuses = (widget.config.statuses as LaunchpadBugStatus[]) || ['New', 'Confirmed', 'Triaged', 'In Progress'];
  const sortBy = (widget.config.sortBy as 'id' | 'status' | 'importance') || 'id';
  const fetchTags = (widget.config.fetchTags as boolean) || false;
  const displayFields = (widget.config.displayFields as string[]) || ['title', 'status', 'id'];
  const setWidgetIssueCount = useDashboardStore((s) => s.setWidgetIssueCount);

  const { data: bugs, isLoading, error } = useLaunchpadBugs({
    dataSourceId: widget.dataSourceId,
    project,
    statuses,
    limit,
    sortBy,
    fetchTags,
    refreshInterval: widget.refreshInterval,
  });

  useEffect(() => {
    setWidgetIssueCount(widget.id, bugs?.length || 0);
  }, [bugs?.length, widget.id, setWidgetIssueCount]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[#7d8590] text-xs">
        <div className="w-3 h-3 border border-orange-500 border-t-transparent rounded-full animate-spin"></div>
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

  if (!bugs || bugs.length === 0) {
    return (
      <div className="flex items-center gap-2 text-emerald-400 text-xs">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="font-mono">No open bugs</span>
      </div>
    );
  }

  const showField = (field: string) => displayFields.includes(field);

  return (
    <div className="space-y-0.5">
      {bugs.map((bug: LaunchpadBugWithTask) => (
        <a
          key={bug.bug_id}
          href={bug.web_link}
          target="_blank"
          rel="noopener noreferrer"
          className={`block px-2 py-1.5 rounded hover:bg-[#161b22] transition-colors group border-l-2 ${getBorderColor(bug.importance)}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {showField('title') && (
                <p className="text-xs text-[#e6edf3] truncate group-hover:text-orange-400 transition-colors font-mono">
                  {bug.title.replace(/^Bug #\d+( in [^:]+)?:\s*"?|"$/g, '')}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {showField('id') && (
                  <>
                    <span className="text-[10px] text-orange-400/70 font-mono">
                      #{bug.bug_id}
                    </span>
                    <span className="text-[#484f58]">·</span>
                  </>
                )}
                {showField('status') && (
                  <>
                    <span className={`text-[10px] font-mono ${getStatusColor(bug.status)}`}>
                      {bug.status}
                    </span>
                    <span className="text-[#484f58]">·</span>
                  </>
                )}
                {showField('reporter') && bug.reporter_name && (
                  <>
                    <span className="text-[10px] text-[#7d8590] font-mono">
                      {bug.reporter_name}
                    </span>
                    <span className="text-[#484f58]">·</span>
                  </>
                )}
                {showField('assignee') && bug.assignee_name && (
                  <>
                    <span className="text-[10px] text-cyan-400/70 font-mono">
                      {bug.assignee_name}
                    </span>
                    <span className="text-[#484f58]">·</span>
                  </>
                )}
                <span className="text-[10px] text-[#484f58] font-mono">
                  {formatDate(bug.date_created)}
                </span>
                {showField('tags') && bug.bug?.tags && bug.bug.tags.length > 0 && (
                  <>
                    <span className="text-[#484f58]">·</span>
                    <span className="text-[10px] text-purple-400/70 font-mono truncate max-w-[100px]">
                      {bug.bug.tags.slice(0, 2).join(', ')}
                      {bug.bug.tags.length > 2 && ` +${bug.bug.tags.length - 2}`}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border shrink-0 ${getImportanceColor(bug.importance)}`}>
              {bug.importance.toUpperCase()}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
