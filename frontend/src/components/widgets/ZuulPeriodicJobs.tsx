import { useZuulBuilds } from '../../hooks/useZuulBuilds';
import type { Widget, ZuulBuild } from '@dashboard/shared';

interface ZuulPeriodicJobsProps {
  widget: Widget;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

export function ZuulPeriodicJobs({ widget }: ZuulPeriodicJobsProps) {
  const project = widget.config.project as string;
  const pipeline = (widget.config.pipeline as string) || 'periodic';
  const limit = (widget.config.limit as number) || 10;

  const { data: builds, isLoading, error } = useZuulBuilds({
    dataSourceId: widget.dataSourceId,
    project,
    pipeline,
    result: 'FAILURE',
    limit,
    refreshInterval: widget.refreshInterval,
  });

  if (isLoading) {
    return <div className="text-slate-500 text-sm">Loading builds...</div>;
  }

  if (error) {
    return <div className="text-red-400 text-sm">Error: {(error as Error).message}</div>;
  }

  if (!builds || builds.length === 0) {
    return (
      <div className="text-green-400 text-sm flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        No failed periodic jobs
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {builds.map((build: ZuulBuild) => (
        <a
          key={build.uuid}
          href={build.log_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-2 rounded hover:bg-slate-700/50 transition-colors border-l-2 border-red-500"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 truncate">
              {build.job_name}
            </p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span>{build.ref.branch}</span>
              <span className="text-slate-600">·</span>
              <span>{formatDuration(build.duration)}</span>
              <span className="text-slate-600">·</span>
              <span>{formatDate(build.end_time)}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
