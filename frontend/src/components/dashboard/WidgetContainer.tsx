import type { JSX } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useDeleteWidget } from '../../hooks/useWidgets';
import { GerritRecentChanges } from '../widgets/GerritRecentChanges';
import { GerritMyChanges } from '../widgets/GerritMyChanges';
import { GerritUserChanges } from '../widgets/GerritUserChanges';
import { ZuulPeriodicJobs } from '../widgets/ZuulPeriodicJobs';
import { IrcRecentMessages } from '../widgets/IrcRecentMessages';
import { LaunchpadBugs } from '../widgets/LaunchpadBugs';
import type { Widget, WidgetConfig, WidgetType } from '@dashboard/shared';

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

function generateGerritSearchUrl(type: WidgetType, config: WidgetConfig): string | null {
  const baseUrl = 'https://review.opendev.org/q/';

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

  if (type === 'gerrit_my_changes') {
    return `${baseUrl}owner:self+(label:Code-Review<0+OR+label:Verified<0)`;
  }

  return null;
}

function generateLaunchpadSearchUrl(config: WidgetConfig): string | null {
  const project = config.project as string;
  if (!project) return null;
  return `https://bugs.launchpad.net/${project}/+bugs`;
}

function getWidgetIcon(type: WidgetType): JSX.Element {
  switch (type) {
    case 'gerrit_recent_changes':
    case 'gerrit_my_changes':
    case 'gerrit_user_changes':
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      );
    case 'zuul_periodic_jobs':
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
      );
    case 'irc_recent_messages':
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      );
    case 'launchpad_bugs':
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 8h-1.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5s-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H5v2h1.09c-.05.33-.09.66-.09 1v1H5v2h1v1c0 .34.04.67.09 1H5v2h1.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H19v-2h-1.09c.05-.33.09-.66.09-1v-1h1v-2h-1v-1c0-.34-.04-.67-.09-1H19V8zm-6 8h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
      );
    default:
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
        </svg>
      );
  }
}

function getWidgetColor(type: WidgetType): string {
  switch (type) {
    case 'gerrit_recent_changes':
    case 'gerrit_my_changes':
    case 'gerrit_user_changes':
      return 'text-emerald-400';
    case 'zuul_periodic_jobs':
      return 'text-amber-400';
    case 'irc_recent_messages':
      return 'text-purple-400';
    case 'launchpad_bugs':
      return 'text-orange-400';
    default:
      return 'text-cyan-400';
  }
}

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
      return shortProject ? `${prefix}: ${shortProject}${branchSuffix}` : 'Recent Changes';
    }
    case 'gerrit_my_changes':
      return 'My Changes';
    case 'gerrit_user_changes':
      return owner ? `Changes: ${owner}` : "User's Changes";
    case 'zuul_periodic_jobs': {
      const parts = [pipeline || 'periodic', shortProject].filter(Boolean);
      return `Zuul: ${parts.join(' / ')}`;
    }
    case 'irc_recent_messages':
      return channel ? `#${channel}` : 'IRC';
    case 'launchpad_bugs':
      return shortProject ? `Bugs: ${shortProject}` : 'Launchpad Bugs';
    default:
      return 'Widget';
  }
}

interface WidgetContainerProps {
  widget: Widget;
}

export function WidgetContainer({ widget }: WidgetContainerProps) {
  const title = generateTitle(widget.type, widget.config);
  const searchUrl = widget.type === 'launchpad_bugs'
    ? generateLaunchpadSearchUrl(widget.config)
    : generateGerritSearchUrl(widget.type, widget.config);
  const { editWidget } = useDashboardStore();
  const deleteWidget = useDeleteWidget();
  const widgetColor = getWidgetColor(widget.type);

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this widget?')) {
      deleteWidget.mutate(widget.id);
    }
  };

  const renderWidget = () => {
    switch (widget.type) {
      case 'gerrit_recent_changes':
        return <GerritRecentChanges widget={widget} />;
      case 'gerrit_my_changes':
        return <GerritMyChanges widget={widget} />;
      case 'gerrit_user_changes':
        return <GerritUserChanges widget={widget} />;
      case 'zuul_periodic_jobs':
        return <ZuulPeriodicJobs widget={widget} />;
      case 'irc_recent_messages':
        return <IrcRecentMessages widget={widget} />;
      case 'launchpad_bugs':
        return <LaunchpadBugs widget={widget} />;
      default:
        return <div className="text-[#7d8590] text-sm">Unknown widget type</div>;
    }
  };

  return (
    <div className="bg-[#0d1117] border border-[#21262d] h-full flex flex-col overflow-hidden group">
      {/* Widget header */}
      <div className="widget-drag-handle flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#21262d] cursor-move">
        <div className="flex items-center gap-2 min-w-0">
          <span className={widgetColor}>
            {getWidgetIcon(widget.type)}
          </span>
          {searchUrl ? (
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onMouseDown={(e) => e.stopPropagation()}
              className="font-mono text-xs text-[#e6edf3] truncate hover:text-cyan-400 transition-colors"
            >
              {title}
            </a>
          ) : (
            <h3 className="font-mono text-xs text-[#e6edf3] truncate">{title}</h3>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => editWidget(widget.id)}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 text-[#484f58] hover:text-[#e6edf3] hover:bg-[#21262d] rounded transition-colors cursor-pointer"
            title="Configure"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 text-[#484f58] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Widget content */}
      <div className="flex-1 overflow-auto p-2">
        {renderWidget()}
      </div>
    </div>
  );
}
