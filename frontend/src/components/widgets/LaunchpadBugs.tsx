import { useEffect } from 'react';
import { useLaunchpadBugs } from '../../hooks/useLaunchpadBugs';
import { useDashboardStore } from '../../store/dashboardStore';
import { Chip, MetaItem, MetaLine, NewDot, RowLink, RowTitle, WidgetEmpty, WidgetError, WidgetLoading, type ChipVariant } from '../ui';
import { formatAbsolute, formatRelative } from '../../lib/format';
import { getNewItemsCutoff } from '../../lib/newItems';
import type { Widget, LaunchpadBugWithTask, LaunchpadBugStatus, LaunchpadBugImportance } from '@dashboard/shared';

interface LaunchpadBugsProps {
  widget: Widget;
}

const STATUS_CLASS: Record<LaunchpadBugStatus, string> = {
  New: 'text-warn',
  'In Progress': 'text-info',
  Confirmed: 'text-fg-2',
  Triaged: 'text-fg-2',
  Incomplete: 'text-fg-3',
  'Fix Committed': 'text-ok',
  'Fix Released': 'text-ok',
};

const IMPORTANCE_VARIANT: Record<Exclude<LaunchpadBugImportance, 'Undecided'>, ChipVariant> = {
  Critical: 'danger',
  High: 'danger',
  Medium: 'warn',
  Low: 'neutral',
  Wishlist: 'neutral',
};

/** Untriaged = status New. (Undecided importance alone isn't: In Progress bugs are being worked on.) */
function isUntriaged(bug: LaunchpadBugWithTask): boolean {
  return bug.status === 'New';
}

function cleanTitle(title: string): string {
  return title.replace(/^Bug #\d+( in [^:]+)?:\s*"?|"$/g, '');
}

function BugRow({ bug, isNew, showField }: { bug: LaunchpadBugWithTask; isNew: boolean; showField: (f: string) => boolean }) {
  const inProgressUnassigned = bug.status === 'In Progress' && !bug.assignee_name;
  const importanceVariant = bug.importance !== 'Undecided' ? IMPORTANCE_VARIANT[bug.importance] : undefined;
  const tags = bug.bug?.tags ?? [];
  const showTitle = showField('title');
  const hasMeta =
    showField('id') ||
    showField('status') ||
    showField('assignee') ||
    inProgressUnassigned ||
    (showField('reporter') && !!bug.reporter_name) ||
    (showField('tags') && tags.length > 0);

  return (
    <RowLink href={bug.web_link} title={`#${bug.bug_id} · reported ${formatAbsolute(bug.date_created)}`}>
      <div className="min-w-0 flex-1">
        {showTitle && (
          <div className="flex min-w-0 items-center gap-1.5">
            {isNew && <NewDot title="Reported recently" />}
            <RowTitle title={cleanTitle(bug.title)}>{cleanTitle(bug.title)}</RowTitle>
          </div>
        )}
        <div className="flex min-w-0 items-center">
        <MetaLine>
          {isNew && !showTitle && <NewDot title="Reported recently" />}
          {showField('id') && <MetaItem mono>#{bug.bug_id}</MetaItem>}
          {showField('status') && <MetaItem className={STATUS_CLASS[bug.status] ?? 'text-fg-2'}>{bug.status}</MetaItem>}
          {(showField('assignee') || inProgressUnassigned) &&
            (bug.assignee_name ? (
              <MetaItem truncate className="min-w-[4ch]" title={`Assignee: ${bug.assignee_name}`}>
                {bug.assignee_name}
              </MetaItem>
            ) : (
              <MetaItem
                truncate
                className={inProgressUnassigned ? 'min-w-[6ch] text-warn' : 'min-w-[4ch]'}
                title={inProgressUnassigned ? 'In Progress but nobody is assigned' : 'Nobody is assigned'}
              >
                unassigned
              </MetaItem>
            ))}
          {showField('reporter') && bug.reporter_name && (
            <MetaItem truncate title={`Reported by ${bug.reporter_name}`}>
              by {bug.reporter_name}
            </MetaItem>
          )}
          {showField('tags') && tags.length > 0 && (
            <MetaItem truncate title={tags.join(', ')}>
              {tags.slice(0, 2).join(', ')}
              {tags.length > 2 && ` +${tags.length - 2}`}
            </MetaItem>
          )}
        </MetaLine>
          {/* Age, outside MetaLine so it can be dropped (with its separator) in very narrow
              widgets; it stays in the row tooltip. */}
          <span
            className="hidden shrink-0 items-center gap-1 pl-1 text-[11px] leading-4 text-fg-3 @xs:flex"
            title={`Reported ${formatAbsolute(bug.date_created)}`}
          >
            {hasMeta && <span aria-hidden>·</span>}
            <span className="font-mono tabular-nums">{formatRelative(bug.date_created)}</span>
          </span>
        </div>
      </div>
      {importanceVariant && (
        <Chip variant={importanceVariant} title={`Importance: ${bug.importance}`}>
          {bug.importance.toUpperCase()}
        </Chip>
      )}
      {isUntriaged(bug) && (
        <Chip variant="warn" title="Status New: needs triage">
          UNTRIAGED
        </Chip>
      )}
    </RowLink>
  );
}

export function LaunchpadBugs({ widget }: LaunchpadBugsProps) {
  const project = widget.config.project as string;
  const limit = (widget.config.limit as number) || 10;
  const statuses = (widget.config.statuses as LaunchpadBugStatus[]) || ['New', 'Confirmed', 'Triaged', 'In Progress'];
  const sortBy = (widget.config.sortBy as 'id' | 'status' | 'importance') || 'id';
  const fetchTags = (widget.config.fetchTags as boolean) || false;
  const displayFields = (widget.config.displayFields as string[]) || ['title', 'status', 'id'];
  const reportWidgetSignals = useDashboardStore((s) => s.reportWidgetSignals);
  const newItemsHours = useDashboardStore((s) => s.newItemsHours);

  // Parse tags from config - can be string (comma-separated) or array
  let tags: string[] | undefined;
  if (widget.config.tags) {
    if (typeof widget.config.tags === 'string') {
      tags = widget.config.tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
    } else if (Array.isArray(widget.config.tags)) {
      tags = widget.config.tags.filter((t) => t && t.length > 0);
    }
  }

  const { data, isLoading, error, refetch } = useLaunchpadBugs({
    dataSourceId: widget.dataSourceId,
    project,
    statuses,
    limit,
    sortBy,
    fetchTags,
    tags,
    refreshInterval: widget.refreshInterval,
  });

  const bugs = data?.bugs;
  const newCutoff = getNewItemsCutoff(newItemsHours);
  const isNew = (bug: LaunchpadBugWithTask) => new Date(bug.date_created) >= newCutoff;

  const total = bugs?.length ?? 0;
  const available = data?.totalSize ?? undefined;
  const truncated = available != null && available > total;
  const action = bugs?.filter(isUntriaged).length ?? 0;
  const newCount = bugs?.filter(isNew).length ?? 0;

  useEffect(() => {
    if (!bugs) return;
    reportWidgetSignals(widget.id, { total, truncated, action, newCount, available });
  }, [bugs, total, truncated, action, newCount, available, widget.id, reportWidgetSignals]);

  if (!project) return <WidgetEmpty icon="settings">Configure a project</WidgetEmpty>;
  if (isLoading) return <WidgetLoading />;
  if (error) return <WidgetError message="Couldn't load Launchpad bugs" error={error} onRetry={() => void refetch()} />;
  if (!bugs || bugs.length === 0) return <WidgetEmpty tone="ok">No open bugs</WidgetEmpty>;

  const showField = (field: string) => displayFields.includes(field);

  return (
    <div className="@container flex flex-col">
      {bugs.map((bug) => (
        <BugRow key={bug.bug_id} bug={bug} isNew={isNew(bug)} showField={showField} />
      ))}
    </div>
  );
}
