import { BaseProvider, ProviderConfig } from './base.provider.js';
import type { LaunchpadBugTask, LaunchpadBugWithTask, LaunchpadBug, LaunchpadBugStatus, LaunchpadBugImportance } from '@dashboard/shared';

export interface LaunchpadBugsQuery {
  project: string;
  statuses?: LaunchpadBugStatus[];
  limit?: number;
  sortBy?: 'id' | 'status' | 'importance';
  fetchTags?: boolean;
  tags?: string[];
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

export interface LaunchpadBugsResult {
  bugs: LaunchpadBugWithTask[];
  /**
   * Number of matching bug tasks on Launchpad before `limit` (the collection's total_size).
   * With a tags filter, the number of tagged matches found among the enriched candidates
   * (a lower bound).
   */
  totalSize: number;
}

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
    return (await this.getBugTasksWithTotal(query)).bugs;
  }

  /** Like getBugTasks, but also returns the total number of matching tasks. */
  async getBugTasksWithTotal(query: LaunchpadBugsQuery): Promise<LaunchpadBugsResult> {
    const { project, statuses, limit = 10, sortBy = 'id', fetchTags = false, tags } = query;

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

    let totalSize = typeof response.total_size === 'number' ? response.total_size : response.entries.length;

    let tasks: LaunchpadBugWithTask[] = response.entries.map((task) => ({
      ...task,
      bug_id: this.extractBugId(task.bug_link),
      reporter_name: this.extractUsername(task.owner_link),
      assignee_name: this.extractUsername(task.assignee_link),
    }));

    // Sort tasks
    tasks = this.sortTasks(tasks, sortBy);

    // If tags filter is specified, we need to fetch bug details for all tasks before limiting
    // to ensure we don't miss bugs with the required tags
    const needsFetchTags = fetchTags || (tags && tags.length > 0);

    if (needsFetchTags && tasks.length > 0) {
      // Fetch more tasks if filtering by tags to account for filtering
      const fetchLimit = tags && tags.length > 0 ? Math.min(tasks.length, limit * 3) : tasks.length;
      const tasksToEnrich = tasks.slice(0, fetchLimit);
      tasks = await this.enrichWithBugDetails(tasksToEnrich);

      // Filter by tags if specified
      if (tags && tags.length > 0) {
        tasks = tasks.filter((task) => {
          if (!task.bug?.tags) return false;
          // Check if the bug has all the required tags
          return tags.every((requiredTag) =>
            task.bug!.tags.some((bugTag) => bugTag.toLowerCase() === requiredTag.toLowerCase())
          );
        });
        totalSize = tasks.length;
      }
    }

    // Limit results after filtering
    tasks = tasks.slice(0, limit);

    return { bugs: tasks, totalSize };
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
