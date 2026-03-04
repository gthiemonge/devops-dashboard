import { useEffect, useRef } from 'react';
import { useZuulBuilds } from '../../hooks/useZuulBuilds';
import { useDashboardStore } from '../../store/dashboardStore';
import type { Widget, ZuulBuild } from '@dashboard/shared';

interface ZuulPeriodicJobsProps {
  widget: Widget;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h${minutes}m`;
  return `${minutes}m`;
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

function getResultBadge(result: string): { label: string; className: string; borderClass: string } {
  switch (result) {
    case 'FAILURE':
      return { label: 'FAIL', className: 'bg-red-500/20 text-red-400 border-red-500/30', borderClass: 'border-red-500/50 hover:border-red-500' };
    case 'POST_FAILURE':
      return { label: 'POST', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30', borderClass: 'border-orange-500/50 hover:border-orange-500' };
    case 'RETRY_LIMIT':
      return { label: 'RETRY', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', borderClass: 'border-yellow-500/50 hover:border-yellow-500' };
    default:
      return { label: result.slice(0, 4), className: 'bg-gray-500/20 text-gray-400 border-gray-500/30', borderClass: 'border-gray-500/50 hover:border-gray-500' };
  }
}

export function ZuulPeriodicJobs({ widget }: ZuulPeriodicJobsProps) {
  const project = widget.config.project as string;
  const pipeline = (widget.config.pipeline as string) || 'periodic';
  const limit = (widget.config.limit as number) || 10;
  const days = (widget.config.days as number) || 7;
  const setWidgetIssueCount = useDashboardStore((s) => s.setWidgetIssueCount);
  const setWidgetNewItemCount = useDashboardStore((s) => s.setWidgetNewItemCount);
  const newItemsHours = useDashboardStore((s) => s.newItemsHours);

  const failureResults = ['FAILURE', 'POST_FAILURE', 'RETRY_LIMIT'];

  const { data: rawBuilds, isLoading, error } = useZuulBuilds({
    dataSourceId: widget.dataSourceId,
    project,
    pipeline,
    limit: limit * 5, // Fetch more to account for filtering
    refreshInterval: widget.refreshInterval,
  });

  // Filter builds by result type, date, and limit
  const builds = rawBuilds
    ? rawBuilds
        .filter((build) => {
          if (!failureResults.includes(build.result)) return false;
          const buildDate = new Date(build.end_time);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          return buildDate >= cutoffDate;
        })
        .slice(0, limit)
    : [];

  // Report issue count (failed builds within date range)
  useEffect(() => {
    setWidgetIssueCount(widget.id, builds.length);
  }, [builds.length, widget.id, setWidgetIssueCount]);

  // Track new items (completed within newItemsHours)
  const prevNewCountRef = useRef<number>(-1);
  useEffect(() => {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - newItemsHours);
    const newCount = builds.filter((b) => new Date(b.end_time) >= cutoffTime).length;
    if (newCount !== prevNewCountRef.current) {
      prevNewCountRef.current = newCount;
      setWidgetNewItemCount(widget.id, newCount);
    }
  }, [builds, widget.id, newItemsHours, setWidgetNewItemCount]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[#7d8590] text-xs">
        <div className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin"></div>
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

  if (!builds || builds.length === 0) {
    return (
      <div className="flex items-center gap-2 text-emerald-400 text-xs">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="font-mono">All jobs passing</span>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {builds.map((build: ZuulBuild) => {
        const badge = getResultBadge(build.result);
        return (
        <a
          key={build.uuid}
          href={build.log_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`block px-2 py-1.5 rounded hover:bg-[#161b22] transition-colors group border-l-2 ${badge.borderClass}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#e6edf3] truncate group-hover:text-amber-400 transition-colors font-mono">
                {build.job_name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-amber-400/70 font-mono">
                  {build.ref.branch}
                </span>
                <span className="text-[#484f58]">·</span>
                <span className="text-[10px] text-[#7d8590] font-mono">
                  {formatDuration(build.duration)}
                </span>
                <span className="text-[#484f58]">·</span>
                <span className="text-[10px] text-[#484f58] font-mono">
                  {formatDate(build.end_time)}
                </span>
              </div>
            </div>
            <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </a>
        );
      })}
    </div>
  );
}
