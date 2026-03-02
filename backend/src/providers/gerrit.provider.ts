import { BaseProvider, ProviderConfig } from './base.provider.js';
import type { GerritChange } from '@dashboard/shared';

export class GerritProvider extends BaseProvider {
  protected serviceName = 'gerrit' as const;

  constructor(config: ProviderConfig) {
    super(config);
  }

  protected override parseResponse<T>(text: string): T {
    const cleanedText = text.startsWith(")]}'\n") ? text.slice(5) : text;
    return JSON.parse(cleanedText) as T;
  }

  private getApiPath(): string {
    return this.config.username && this.config.password ? '/a' : '';
  }

  async getChanges(query: string, options: { limit?: number; offset?: number } = {}): Promise<GerritChange[]> {
    const params = new URLSearchParams({ q: query });
    if (options.limit) params.append('n', options.limit.toString());
    if (options.offset) params.append('start', options.offset.toString());
    params.append('o', 'LABELS');
    params.append('o', 'DETAILED_ACCOUNTS');

    const path = `${this.getApiPath()}/changes/?${params.toString()}`;
    return this.fetch<GerritChange[]>(path);
  }

  async getRecentChanges(project: string, limit: number = 10): Promise<GerritChange[]> {
    const query = `project:${project} status:open`;
    return this.getChanges(query, { limit });
  }

  async getMyChanges(query: string = '', limit: number = 10): Promise<GerritChange[]> {
    const baseQuery = 'owner:self (label:Code-Review<0 OR label:Verified<0)';
    const fullQuery = query ? `${baseQuery} ${query}` : baseQuery;
    return this.getChanges(fullQuery, { limit });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const path = `${this.getApiPath()}/config/server/version`;
      await this.fetch<string>(path);
      return true;
    } catch {
      return false;
    }
  }
}
