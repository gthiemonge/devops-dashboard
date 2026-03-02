import { Router, Request, Response } from 'express';
import db from '../db/database.js';
import { GerritProvider, ZuulProvider } from '../providers/index.js';
import { cacheService } from '../services/cache.service.js';
import type { ApiResponse, DashboardSummary, WidgetSummary, Widget, GerritChange, ZuulBuild } from '@dashboard/shared';

export const summaryRouter = Router();

interface DbWidget {
  id: number;
  type: string;
  title: string;
  data_source_id: number;
  config: string;
}

interface DbDataSource {
  id: number;
  base_url: string;
  type: string;
}

interface DbCredential {
  username: string;
  password: string;
}

async function getWidgetSummary(widget: Widget): Promise<WidgetSummary> {
  const dataSource = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(widget.dataSourceId) as DbDataSource | undefined;
  if (!dataSource) {
    return {
      widgetId: widget.id,
      type: widget.type,
      title: widget.title,
      count: 0,
      urgent: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  let count = 0;
  let urgent = 0;

  try {
    if (widget.type === 'gerrit_recent_changes' || widget.type === 'gerrit_my_changes') {
      const credential = db.prepare('SELECT username, password FROM credentials WHERE data_source_id = ?').get(widget.dataSourceId) as DbCredential | undefined;
      const provider = new GerritProvider({
        baseUrl: dataSource.base_url,
        username: credential?.username,
        password: credential?.password,
      });

      const project = widget.config.project as string || 'openstack/octavia';
      const limit = widget.config.limit as number || 10;
      const query = widget.type === 'gerrit_my_changes'
        ? 'owner:self (label:Code-Review<0 OR label:Verified<0)'
        : `project:${project} status:open`;

      const cacheKey = `summary:gerrit:${widget.id}:${query}`;
      const changes = await cacheService.getOrSet<GerritChange[]>(cacheKey, () =>
        provider.getChanges(query, { limit }), 60
      );

      count = changes.length;
      urgent = changes.filter(c => {
        const labels = c.labels || {};
        const hasNegativeReview = labels['Code-Review']?.rejected ||
          (labels['Code-Review']?.value !== undefined && labels['Code-Review'].value < 0);
        const hasFailedVerify = labels['Verified']?.rejected ||
          (labels['Verified']?.value !== undefined && labels['Verified'].value < 0);
        return hasNegativeReview || hasFailedVerify;
      }).length;
    } else if (widget.type === 'zuul_periodic_jobs') {
      const provider = new ZuulProvider({ baseUrl: dataSource.base_url });
      const project = widget.config.project as string;
      const pipeline = widget.config.pipeline as string || 'periodic';
      const limit = widget.config.limit as number || 10;

      const cacheKey = `summary:zuul:${widget.id}:${project}:${pipeline}`;
      const builds = await cacheService.getOrSet<ZuulBuild[]>(cacheKey, () =>
        provider.getBuilds({ project, pipeline, result: 'FAILURE', limit }), 60
      );

      count = builds.length;
      urgent = builds.length;
    }
  } catch {
    // Silently fail for summary
  }

  return {
    widgetId: widget.id,
    type: widget.type,
    title: widget.title,
    count,
    urgent,
    lastUpdated: new Date().toISOString(),
  };
}

summaryRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM widgets').all() as (DbWidget & { dashboard_id: number; refresh_interval: number; created_at: string; updated_at: string })[];
    const widgets: Widget[] = rows.map(row => ({
      id: row.id,
      dashboardId: row.dashboard_id,
      type: row.type as Widget['type'],
      title: row.title,
      dataSourceId: row.data_source_id,
      config: JSON.parse(row.config),
      refreshInterval: row.refresh_interval || 300,
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
    }));

    const summaries = await Promise.all(widgets.map(getWidgetSummary));
    const totalItems = summaries.reduce((sum, s) => sum + s.count, 0);
    const totalUrgent = summaries.reduce((sum, s) => sum + s.urgent, 0);

    const summary: DashboardSummary = {
      widgets: summaries,
      totalItems,
      totalUrgent,
      lastUpdated: new Date().toISOString(),
    };

    const response: ApiResponse<DashboardSummary> = { success: true, data: summary };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});
