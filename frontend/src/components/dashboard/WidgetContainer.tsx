import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useDashboardStore, useWidgetSignals } from '../../store/dashboardStore';
import { useDeleteWidget } from '../../hooks/useWidgets';
import { GerritRecentChanges } from '../widgets/GerritRecentChanges';
import { GerritMyChanges } from '../widgets/GerritMyChanges';
import { GerritUserChanges } from '../widgets/GerritUserChanges';
import { GerritCustomQuery } from '../widgets/GerritCustomQuery';
import { ZuulPeriodicJobs } from '../widgets/ZuulPeriodicJobs';
import { IrcRecentMessages } from '../widgets/IrcRecentMessages';
import { LaunchpadBugs } from '../widgets/LaunchpadBugs';
import type { Widget, WidgetConfig, WidgetType } from '@dashboard/shared';
import { Button, Chip, ConfirmButton, Icon, WidgetError } from '../ui';
import { cx } from '../../lib/cx';

function formatProjects(projectInput: string | undefined): string {
  if (!projectInput) return '';
  const projects = projectInput.split(',').map(p => p.trim().replace('openstack/', '')).filter(Boolean);
  if (projects.length === 0) return '';
  if (projects.length === 1) return projects[0];
  if (projects.length === 2) return projects.join(', ');
  return `${projects[0]} +${projects.length - 1}`;
}

function toGerritProject(project: string): string {
  if (project.startsWith('^')) return project;
  if (project.includes('*')) {
    const escaped = project.replace(/[.+?{}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\*/g, '.*');
    return `^${regex}`;
  }
  return project;
}

const DEFAULT_GERRIT_URL = 'https://review.opendev.org';

function generateGerritSearchUrl(type: WidgetType, config: WidgetConfig, gerritUrl?: string): string | null {
  const baseUrl = `${(gerritUrl || DEFAULT_GERRIT_URL).replace(/\/+$/, '')}/q/`;

  if (type === 'gerrit_recent_changes') {
    const projectInput = (config.project as string) || '';
    const branchInput = (config.branch as string) || '';
    const projects = projectInput.split(',').map(p => p.trim()).filter(Boolean);
    if (projects.length === 0) return null;
    const projectQuery = projects.length === 1
      ? `project:${toGerritProject(projects[0])}`
      : `(${projects.map(p => `project:${toGerritProject(p)}`).join('+OR+')})`;
    let branchQuery = '';
    if (branchInput) {
      const branch = branchInput.trim();
      if (branch.includes('*')) {
        const escaped = branch.replace(/[.+?{}()|[\]\\]/g, '\\$&');
        const regex = escaped.replace(/\*/g, '.*');
        branchQuery = `+branch:^${regex}`;
      } else {
        branchQuery = `+branch:${branch}`;
      }
    }
    return `${baseUrl}${projectQuery}${branchQuery}+status:open`;
  }

  if (type === 'gerrit_user_changes') {
    const owner = config.owner as string;
    if (!owner) return null;
    const query = config.query as string;
    const baseQuery = `owner:${owner}+status:open`;
    return query ? `${baseUrl}${baseQuery}+${encodeURIComponent(query)}` : `${baseUrl}${baseQuery}`;
  }

  if (type === 'gerrit_custom_query') {
    const query = ((config.query as string) || '').replace(/\s+/g, ' ').trim();
    return query ? `${baseUrl}${encodeURIComponent(query)}` : null;
  }

  if (type === 'gerrit_my_changes') {
    return `${baseUrl}owner:self+status:open+(label:Code-Review<0+OR+label:Verified<0)`;
  }

  return null;
}

function generateLaunchpadSearchUrl(config: WidgetConfig): string | null {
  const project = config.project as string;
  if (!project) return null;
  return `https://bugs.launchpad.net/${project}/+bugs`;
}

type SourceKind = 'gerrit' | 'zuul' | 'irc' | 'launchpad';

const SOURCE: Record<WidgetType, { kind: SourceKind; color: string; label: string }> = {
  gerrit_recent_changes: { kind: 'gerrit', color: 'text-gerrit', label: 'Gerrit' },
  gerrit_my_changes: { kind: 'gerrit', color: 'text-gerrit', label: 'Gerrit' },
  gerrit_user_changes: { kind: 'gerrit', color: 'text-gerrit', label: 'Gerrit' },
  gerrit_custom_query: { kind: 'gerrit', color: 'text-gerrit', label: 'Gerrit' },
  zuul_periodic_jobs: { kind: 'zuul', color: 'text-zuul', label: 'Zuul' },
  irc_recent_messages: { kind: 'irc', color: 'text-irc', label: 'IRC' },
  launchpad_bugs: { kind: 'launchpad', color: 'text-launchpad', label: 'Launchpad' },
};

function generateTitle(type: WidgetType, config: WidgetConfig): string {
  const project = config.project as string;
  const owner = config.owner as string;
  const pipeline = config.pipeline as string;
  const branch = config.branch as string;
  const channel = config.channel as string;
  const shortProject = formatProjects(project);

  switch (type) {
    case 'gerrit_recent_changes': {
      const isBackports = branch && (branch.includes('stable') || branch.startsWith('stable'));
      const prefix = isBackports ? 'Backports' : 'Changes';
      const branchSuffix = branch && !isBackports ? ` (${branch})` : '';
      return shortProject ? `${prefix}: ${shortProject}${branchSuffix}` : 'Recent changes';
    }
    case 'gerrit_my_changes':
      return 'My changes with negative votes';
    case 'gerrit_user_changes':
      return owner ? `Changes: ${owner}` : "User's changes";
    case 'zuul_periodic_jobs': {
      const parts = [pipeline || 'periodic', shortProject].filter(Boolean);
      return `Zuul: ${parts.join(' / ')}`;
    }
    case 'irc_recent_messages':
      return channel ? `#${channel}` : 'IRC';
    case 'launchpad_bugs':
      return shortProject ? `Bugs: ${shortProject}` : 'Launchpad bugs';
    default:
      return 'Widget';
  }
}

/** Keeps one crashing widget from taking down the whole dashboard. */
class WidgetErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Widget crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error != null) {
      return (
        <WidgetError
          message="This widget failed to render"
          error={this.state.error}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

interface WidgetContainerProps {
  widget: Widget;
}

export function WidgetContainer({ widget }: WidgetContainerProps) {
  const title = widget.type === 'gerrit_custom_query'
    ? widget.title
    : generateTitle(widget.type, widget.config);
  // Link Gerrit searches to the widget's own Gerrit instance (falls back to opendev)
  const gerritUrl = useDashboardStore((s) => {
    const ds = s.dataSources.find((d) => d.id === widget.dataSourceId);
    return ds?.type === 'gerrit' ? ds.baseUrl : undefined;
  });
  const searchUrl = widget.type === 'launchpad_bugs'
    ? generateLaunchpadSearchUrl(widget.config)
    : generateGerritSearchUrl(widget.type, widget.config, gerritUrl);
  const editWidget = useDashboardStore((s) => s.editWidget);
  const locked = useDashboardStore((s) =>
    s.currentDashboardId == null ? true : !s.unlockedDashboardIds[s.currentDashboardId],
  );
  const { total, truncated, action, available } = useWidgetSignals(widget.id);
  const showAvailable = available != null && available > total;
  const deleteWidget = useDeleteWidget();
  const source = SOURCE[widget.type] as (typeof SOURCE)[WidgetType] | undefined;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const renderWidget = () => {
    switch (widget.type) {
      case 'gerrit_recent_changes':
        return <GerritRecentChanges widget={widget} />;
      case 'gerrit_my_changes':
        return <GerritMyChanges widget={widget} />;
      case 'gerrit_user_changes':
        return <GerritUserChanges widget={widget} />;
      case 'gerrit_custom_query':
        return <GerritCustomQuery widget={widget} />;
      case 'zuul_periodic_jobs':
        return <ZuulPeriodicJobs widget={widget} />;
      case 'irc_recent_messages':
        return <IrcRecentMessages widget={widget} />;
      case 'launchpad_bugs':
        return <LaunchpadBugs widget={widget} />;
      default:
        return <WidgetError message="Unknown widget type" />;
    }
  };

  return (
    <section
      aria-label={title}
      className="group/card flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface"
    >
      {/* Widget header (drag handle when unlocked) */}
      <div
        className={cx(
          'widget-drag-handle flex h-9 shrink-0 items-center gap-2 border-b border-line bg-surface-2 pl-3 pr-1.5',
          locked ? 'cursor-default' : 'cursor-move',
        )}
      >
        {source && (
          <Icon name={source.kind} size={14} strokeWidth={2} className={source.color} title={source.label} />
        )}
        <h3 className="flex min-w-0 items-center text-[13px] font-semibold text-fg">
          {searchUrl ? (
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onMouseDown={stop}
              title={`Open in ${source?.label ?? 'source'}`}
              className="group/title flex min-w-0 items-center gap-1 rounded-sm hover:text-accent"
            >
              <span className="truncate">{title}</span>
              <Icon
                name="external-link"
                size={12}
                className="text-fg-3 opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-visible/title:opacity-100 group-hover/title:text-accent"
              />
            </a>
          ) : (
            <span className="truncate">{title}</span>
          )}
        </h3>

        {total > 0 && (
          <span
            className="shrink-0 font-mono text-[11px] tabular-nums text-fg-3"
            title={
              showAvailable
                ? `Showing ${total} of ${available} items`
                : truncated
                  ? `Showing the first ${total} items`
                  : `${total} item${total === 1 ? '' : 's'}`
            }
          >
            {showAvailable ? `${total} of ${available}` : `${total}${truncated ? '+' : ''}`}
          </span>
        )}
        {action > 0 && (
          <Chip variant="danger" size="sm" title={`${action} need action`}>
            {action}
          </Chip>
        )}

        <span className="flex-1" />

        {/* Actions (only when unlocked; shown on hover or keyboard focus) */}
        {!locked && (
          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              icon="edit"
              aria-label="Configure widget"
              onClick={() => editWidget(widget.id)}
              onMouseDown={stop}
            />
            <ConfirmButton
              variant="ghost"
              size="sm"
              icon="trash"
              aria-label="Delete widget"
              confirmLabel="Delete?"
              onConfirm={() => deleteWidget.mutate(widget.id)}
              onMouseDown={stop}
            />
          </div>
        )}
      </div>

      {/* Widget content */}
      <div className="min-h-0 flex-1 overflow-auto py-1">
        <WidgetErrorBoundary>{renderWidget()}</WidgetErrorBoundary>
      </div>
    </section>
  );
}
