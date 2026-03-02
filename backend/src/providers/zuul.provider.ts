import { BaseProvider, ProviderConfig } from './base.provider.js';
import type { ZuulBuild } from '@dashboard/shared';

export interface ZuulBuildsQuery {
  project?: string;
  pipeline?: string;
  branch?: string;
  result?: string;
  limit?: number;
  skip?: number;
}

export class ZuulProvider extends BaseProvider {
  private tenant: string;

  constructor(config: ProviderConfig, tenant: string = 'openstack') {
    super(config);
    this.tenant = tenant;
  }

  async getBuilds(query: ZuulBuildsQuery = {}): Promise<ZuulBuild[]> {
    const params = new URLSearchParams();
    if (query.project) params.append('project', query.project);
    if (query.pipeline) params.append('pipeline', query.pipeline);
    if (query.branch) params.append('branch', query.branch);
    if (query.result) params.append('result', query.result);
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.skip) params.append('skip', query.skip.toString());

    const path = `/api/tenant/${this.tenant}/builds?${params.toString()}`;
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
      const path = `/api/tenant/${this.tenant}/status`;
      await this.fetch<unknown>(path);
      return true;
    } catch {
      return false;
    }
  }
}
