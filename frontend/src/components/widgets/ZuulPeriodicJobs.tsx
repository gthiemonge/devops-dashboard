import { useEffect, useMemo } from 'react';
import { useZuulBuilds } from '../../hooks/useZuulBuilds';
import { useDashboardStore } from '../../store/dashboardStore';
import { Chip, MetaItem, MetaLine, NewDot, RowLink, RowTitle, WidgetEmpty, WidgetError, WidgetLoading } from '../ui';
import { formatAbsolute, formatDuration, formatRelative } from '../../lib/format';
import { getNewItemsCutoff } from '../../lib/newItems';
import { cx } from '../../lib/cx';
import { compareGroups, groupBuilds, latestProblem, type ZuulJobGroup, type ZuulRun } from './zuul/groupBuilds';
import type { Widget } from '@dashboard/shared';

interface ZuulPeriodicJobsProps {
  widget: Widget;
}

/** Number of recent results drawn in the streak sparkline. */
const SPARK_RUNS = 12;
const SPARK_RUNS_NARROW = 6;

/** "3d ago" / "on Sep 1" / "just now" from formatRelative output. */
function ago(time: number): string {
  const rel = formatRelative(time);
  if (rel === 'now') return 'just now';
  return /^\d/.test(rel) ? `${rel} ago` : `on ${rel}`;
}

function runTitle(run: ZuulRun): string {
  const duration = formatDuration(run.build.duration);
  return `${run.build.result} · ${formatAbsolute(run.time)}${duration ? ` · ${duration}` : ''}`;
}

/** Recent results as tiny squares, oldest → newest (left → right). */
function StreakSparkline({ runs }: { runs: ZuulRun[] }) {
  const recent = runs.slice(0, SPARK_RUNS).reverse();
  const count = (outcome: ZuulRun['outcome']) => recent.filter((r) => r.outcome === outcome).length;
  return (
    <span
      className="flex shrink-0 items-center gap-px"
      role="img"
      aria-label={`Last ${recent.length} runs: ${count('fail')} failed, ${count('retry')} retried, ${count('pass')} passed`}
    >
      {recent.map((run, i) => (
        <span
          key={run.build.uuid}
          title={runTitle(run)}
          className={cx(
            'size-1.5 rounded-[1px]',
            run.outcome === 'fail' ? 'bg-danger' : run.outcome === 'retry' ? 'bg-warn' : 'bg-ok/70',
            // Narrow widget: only the newest SPARK_RUNS_NARROW runs.
            i < recent.length - SPARK_RUNS_NARROW && 'hidden @xs:block',
          )}
        />
      ))}
    </span>
  );
}

function ZuulJobRow({ group, isNew, retries }: { group: ZuulJobGroup; isNew: boolean; retries: number }) {
  const problem = latestProblem(group);
  const link = problem?.build.log_url || undefined;
  const latestDuration = formatDuration(group.latest.build.duration);

  let health: string;
  let healthTitle: string | undefined;
  if (group.lastSuccess) {
    health = `last success ${ago(group.lastSuccess.time)}`;
    healthTitle = formatAbsolute(group.lastSuccess.time);
  } else {
    const n = group.completedRuns;
    health = `no success in ${n} run${n === 1 ? '' : 's'}`;
    healthTitle = `No successful run among the ${n} most recent builds fetched`;
  }

  return (
    <RowLink
      href={link}
      dimmed={!group.voting}
      title={problem ? `Latest ${problem.outcome === 'retry' ? 'retry' : 'failure'}: ${problem.build.result} · ${formatAbsolute(problem.time)}` : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {isNew && <NewDot title="Failed or retried recently" />}
          {/* Truncate from the start: job names share long prefixes, the suffix tells them apart. */}
          <RowTitle dir="rtl" className="text-left" title={group.jobName}>
            <span dir="ltr">{group.jobName}</span>
          </RowTitle>
        </div>
        <MetaLine>
          <MetaItem title="Branch">{group.branch}</MetaItem>
          <MetaItem
            truncate
            title={healthTitle}
            className={cx(!group.lastSuccess && group.voting && 'text-danger')}
          >
            {health}
          </MetaItem>
          {latestDuration && (
            <MetaItem mono title="Duration of the latest run">
              {latestDuration}
            </MetaItem>
          )}
        </MetaLine>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          {!group.voting && (
            <Chip variant="neutral" title="Non-voting job">
              NV
            </Chip>
          )}
          {retries > 0 && (
            <Chip variant="warn" icon="refresh" title={`Retried ${retries} time${retries === 1 ? '' : 's'} (automatic Zuul retry)`}>
              {retries}
            </Chip>
          )}
          {group.streak > 0 && (
            <Chip variant="danger" title={`Failed ${group.streak} time${group.streak === 1 ? '' : 's'} in a row`}>
              ×{group.streak}
            </Chip>
          )}
        </div>
        <StreakSparkline runs={group.runs} />
      </div>
    </RowLink>
  );
}

export function ZuulPeriodicJobs({ widget }: ZuulPeriodicJobsProps) {
  const project = widget.config.project as string;
  const pipeline = (widget.config.pipeline as string) || 'periodic';
  const limit = (widget.config.limit as number) || 10;
  const days = (widget.config.days as number) || 7;
  const reportWidgetSignals = useDashboardStore((s) => s.reportWidgetSignals);
  const newItemsHours = useDashboardStore((s) => s.newItemsHours);

  const { data: rawBuilds, isLoading, error, refetch } = useZuulBuilds({
    dataSourceId: widget.dataSourceId,
    project,
    pipeline,
    // All results (passes included, for streaks / last success); ~2 weeks of a daily pipeline.
    limit: limit * 20,
    refreshInterval: widget.refreshInterval,
  });

  // One row per (job, branch) whose latest failure or retry is within `days`.
  const { groups, truncated, action, cutoff } = useMemo(() => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    if (!rawBuilds) return { groups: [] as ZuulJobGroup[], truncated: false, action: 0, cutoff };
    const recent = groupBuilds(rawBuilds)
      .filter((g) => (latestProblem(g)?.time ?? 0) >= cutoff)
      .sort(compareGroups);
    return {
      groups: recent.slice(0, limit),
      truncated: recent.length > limit,
      // Retries are a warning, not an action: only failing voting jobs count.
      action: recent.filter((g) => g.voting && g.streak > 0).length,
      cutoff,
    };
  }, [rawBuilds, days, limit]);

  const newCutoff = getNewItemsCutoff(newItemsHours).getTime();
  const isNew = (g: ZuulJobGroup) => (latestProblem(g)?.time ?? 0) >= newCutoff;
  const recentRetries = (g: ZuulJobGroup) => g.retries.filter((r) => r.time >= cutoff).length;
  const newCount = groups.filter(isNew).length;

  useEffect(() => {
    if (!rawBuilds) return;
    reportWidgetSignals(widget.id, { total: groups.length, truncated, action, newCount });
  }, [rawBuilds, groups.length, truncated, action, newCount, widget.id, reportWidgetSignals]);

  if (isLoading) return <WidgetLoading />;
  if (error) return <WidgetError message="Couldn't load Zuul builds" error={error} onRetry={() => void refetch()} />;
  if (!rawBuilds || rawBuilds.length === 0) return <WidgetEmpty>No builds found</WidgetEmpty>;
  if (groups.length === 0) {
    return (
      <WidgetEmpty tone="ok">
        No failures or retries in the last {days} day{days === 1 ? '' : 's'}
      </WidgetEmpty>
    );
  }

  return (
    <div className="@container flex flex-col">
      {groups.map((group) => (
        <ZuulJobRow key={group.key} group={group} isNew={isNew(group)} retries={recentRetries(group)} />
      ))}
    </div>
  );
}
