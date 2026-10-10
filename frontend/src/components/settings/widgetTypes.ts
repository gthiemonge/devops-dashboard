import type { WidgetType } from '@dashboard/shared';

export type WidgetSourceType = 'gerrit' | 'zuul' | 'irc' | 'launchpad';

export interface WidgetTypeOption {
  type: WidgetType;
  name: string;
  description: string;
  sourceType: WidgetSourceType;
  defaultConfig: Record<string, unknown>;
}

/** Source groups, in picker order. */
export const WIDGET_SOURCES: WidgetSourceType[] = ['gerrit', 'zuul', 'launchpad', 'irc'];

export const WIDGET_TYPES: WidgetTypeOption[] = [
  {
    type: 'gerrit_recent_changes',
    name: 'Recent changes',
    description: 'Open changes for one or more projects, optionally filtered by branch.',
    sourceType: 'gerrit',
    defaultConfig: { project: 'openstack/octavia', limit: 10, message: '' },
  },
  {
    type: 'gerrit_my_changes',
    name: 'My changes with negative votes',
    description: 'Your open changes with a negative Code-Review or CI (Verified) vote.',
    sourceType: 'gerrit',
    defaultConfig: { limit: 10 },
  },
  {
    type: 'gerrit_user_changes',
    name: 'User’s changes',
    description: 'Open changes owned by another user.',
    sourceType: 'gerrit',
    defaultConfig: { owner: '', limit: 10, message: '' },
  },
  {
    type: 'gerrit_custom_query',
    name: 'Custom query',
    description: 'Changes matching any Gerrit search query.',
    sourceType: 'gerrit',
    defaultConfig: { query: 'status:open', limit: 10 },
  },
  {
    type: 'zuul_periodic_jobs',
    name: 'Failed jobs',
    description: 'Failing Zuul jobs of a pipeline, e.g. periodic.',
    sourceType: 'zuul',
    defaultConfig: { project: 'openstack/octavia', pipeline: 'periodic', limit: 10, days: 7 },
  },
  {
    type: 'irc_recent_messages',
    name: 'IRC messages',
    description: 'Recent messages from a channel log.',
    sourceType: 'irc',
    defaultConfig: { channel: 'openstack-lbaas', limit: 20 },
  },
  {
    type: 'launchpad_bugs',
    name: 'Launchpad bugs',
    description: 'Open bugs of a Launchpad project.',
    sourceType: 'launchpad',
    defaultConfig: {
      project: 'octavia',
      limit: 10,
      statuses: ['New', 'Confirmed', 'Triaged', 'In Progress'],
      sortBy: 'id',
      displayFields: ['title', 'status', 'id'],
      fetchTags: false,
    },
  },
];

export function getWidgetTypeOption(type: WidgetType): WidgetTypeOption | undefined {
  return WIDGET_TYPES.find((t) => t.type === type);
}

/** Title stored for newly created widgets (only displayed for custom queries). */
export function generateTitle(type: WidgetType, config: Record<string, unknown>): string {
  const project = config.project as string;
  const owner = config.owner as string;
  const channel = config.channel as string;
  const shortProject = project?.replace('openstack/', '') || '';

  switch (type) {
    case 'gerrit_recent_changes':
      return shortProject ? `Changes: ${shortProject}` : 'Recent Changes';
    case 'gerrit_my_changes':
      return 'My Changes with Negative Votes';
    case 'gerrit_user_changes':
      return owner ? `Changes: ${owner}` : "User's Changes";
    case 'gerrit_custom_query':
      return ((config.query as string) || '').replace(/\s+/g, ' ').trim() || 'Custom Query';
    case 'zuul_periodic_jobs':
      return shortProject ? `Zuul: ${shortProject}` : 'Zuul Periodic';
    case 'irc_recent_messages':
      return channel ? `IRC: #${channel}` : 'IRC Messages';
    case 'launchpad_bugs':
      return shortProject ? `Bugs: ${shortProject}` : 'Launchpad Bugs';
    default:
      return 'Widget';
  }
}
