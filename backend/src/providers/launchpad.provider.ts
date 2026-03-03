import { BaseProvider, ProviderConfig } from './base.provider.js';
import type { LaunchpadBugTask, LaunchpadBugWithTask, LaunchpadBug, LaunchpadBugStatus, LaunchpadBugImportance } from '@dashboard/shared';

export interface LaunchpadBugsQuery {
  project: string;
  statuses?: LaunchpadBugStatus[];
  limit?: number;
  sortBy?: 'id' | 'status' | 'importance';
  fetchTags?: boolean;
}

interface LaunchpadCollectionResponse {
  entries: LaunchpadBugTask[];
  total_size: number;
  start: number;
  next_collection_link?: string;
}

const IMPORTANCE_ORDER: Record<LaunchpadBugImportance, number> = {
  'Critical': 0,
  'High': 1,
  'Medium': 2,
  'Low': 3,
  'Wishlist': 4,
  'Undecided': 5,
};

const STATUS_ORDER: Record<LaunchpadBugStatus, number> = {
  'In Progress': 0,
  'Triaged': 1,
  'Confirmed': 2,
  'New': 3,
  'Incomplete': 4,
  'Fix Committed': 5,
  'Fix Released': 6,
};

export class LaunchpadProvider extends BaseProvider {
  protected serviceName = 'launchpad' as const;

  constructor(config: ProviderConfig) {
    super(config);
  }

  private extractBugId(bugLink: string): number {
    const match = bugLink.match(/bugs\/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private extractUsername(link: string | null): string | undefined {
    if (!link) return undefined;
    const match = link.match(/~([^/]+)$/);
    return match ? match[1] : undefined;
  }

  async getBugTasks(query: LaunchpadBugsQuery): Promise<LaunchpadBugWithTask[]> {
    const { project, statuses, limit = 10, sortBy = 'id', fetchTags = false } = query;

    const params = new URLSearchParams();
    params.append('ws.op', 'searchTasks');

    const statusList = statuses || ['New', 'Confirmed', 'Triaged', 'In Progress'];
    for (const status of statusList) {
      params.append('status', status);
    }

    // Request API-level sorting to get most relevant results first
    // This ensures we don't miss recent bugs due to pagination
    switch (sortBy) {
      case 'id':
        params.append('order_by', '-datecreated');
        break;
      case 'importance':
        params.append('order_by', 'importance');
        break;
      case 'status':
        params.append('order_by', 'status');
        break;
    }

    const path = `/${project}?${params.toString()}`;
    const response = await this.fetch<LaunchpadCollectionResponse>(path);

    let tasks: LaunchpadBugWithTask[] = response.entries.map((task) => ({
      ...task,
      bug_id: this.extractBugId(task.bug_link),
      reporter_name: this.extractUsername(task.owner_link),
      assignee_name: this.extractUsername(task.assignee_link),
    }));

    // Sort tasks
    tasks = this.sortTasks(tasks, sortBy);

    // Limit results
    tasks = tasks.slice(0, limit);

    // Optionally fetch bug details for tags
    if (fetchTags && tasks.length > 0) {
      tasks = await this.enrichWithBugDetails(tasks);
    }

    return tasks;
  }

  private sortTasks(tasks: LaunchpadBugWithTask[], sortBy: 'id' | 'status' | 'importance'): LaunchpadBugWithTask[] {
    return [...tasks].sort((a, b) => {
      switch (sortBy) {
        case 'id':
          return b.bug_id - a.bug_id;
        case 'importance':
          return IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance];
        case 'status':
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        default:
          return b.bug_id - a.bug_id;
      }
    });
  }

  private async enrichWithBugDetails(tasks: LaunchpadBugWithTask[]): Promise<LaunchpadBugWithTask[]> {
    const bugPromises = tasks.map(async (task) => {
      try {
        const bugPath = `/bugs/${task.bug_id}`;
        const bug = await this.fetch<LaunchpadBug>(bugPath);
        return { ...task, bug };
      } catch {
        return task;
      }
    });

    return Promise.all(bugPromises);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch<unknown>('/openstack');
      return true;
    } catch {
      return false;
    }
  }
}
