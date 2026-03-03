import { BaseProvider, ProviderConfig } from './base.provider.js';
import type { ZuulBuild } from '@dashboard/shared';

export interface ZuulBuildsQuery {
  project?: string;
  pipeline?: string;
  branch?: string;
  result?: string;
  results?: string[];  // Multiple results to fetch in parallel
  limit?: number;
  skip?: number;
}

export class ZuulProvider extends BaseProvider {
  protected serviceName = 'zuul' as const;

  constructor(config: ProviderConfig) {
    super(config);
  }

  async getBuilds(query: ZuulBuildsQuery = {}): Promise<ZuulBuild[]> {
    // If multiple results specified, fetch each in parallel and merge
    if (query.results && query.results.length > 0) {
      const fetchPromises = query.results.map((result) =>
        this.fetchBuildsForResult({ ...query, result, results: undefined })
      );
      const allResults = await Promise.all(fetchPromises);
      const merged = allResults.flat();
      // Sort by end_time descending and apply limit
      merged.sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());
      return query.limit ? merged.slice(0, query.limit) : merged;
    }

    return this.fetchBuildsForResult(query);
  }

  private async fetchBuildsForResult(query: ZuulBuildsQuery): Promise<ZuulBuild[]> {
    const params = new URLSearchParams();
    if (query.project) params.append('project', query.project);
    if (query.pipeline) params.append('pipeline', query.pipeline);
    if (query.branch) params.append('branch', query.branch);
    if (query.result) params.append('result', query.result);
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.skip) params.append('skip', query.skip.toString());

    const path = `/api/builds?${params.toString()}`;
    return this.fetch<ZuulBuild[]>(path);
  }

  async getFailedPeriodicBuilds(project: string, limit: number = 10): Promise<ZuulBuild[]> {
    return this.getBuilds({
      project,
      pipeline: 'periodic',
      result: 'FAILURE',
      limit,
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch<unknown>('/api/builds?limit=1');
      return true;
    } catch {
      return false;
    }
  }
}
