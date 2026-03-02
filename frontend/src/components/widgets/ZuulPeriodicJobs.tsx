import { useEffect } from 'react';
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

export function ZuulPeriodicJobs({ widget }: ZuulPeriodicJobsProps) {
  const project = widget.config.project as string;
  const pipeline = (widget.config.pipeline as string) || 'periodic';
  const limit = (widget.config.limit as number) || 10;
  const days = (widget.config.days as number) || 7;
  const setWidgetIssueCount = useDashboardStore((s) => s.setWidgetIssueCount);

  const { data: rawBuilds, isLoading, error } = useZuulBuilds({
    dataSourceId: widget.dataSourceId,
    project,
    pipeline,
    result: 'FAILURE',
    limit: limit * 3, // Fetch more to account for date filtering
    refreshInterval: widget.refreshInterval,
  });

  // Filter builds by date and limit
  const builds = rawBuilds
    ? rawBuilds
        .filter((build) => {
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
      {builds.map((build: ZuulBuild) => (
        <a
          key={build.uuid}
          href={build.log_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-2 py-1.5 rounded hover:bg-[#161b22] transition-colors group border-l-2 border-red-500/50 hover:border-red-500"
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
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-red-500/20 text-red-400 border border-red-500/30">
              FAIL
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
