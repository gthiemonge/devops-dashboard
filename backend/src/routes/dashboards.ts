import { Router, Request, Response } from 'express';
import db from '../db/database.js';
import type { ApiResponse, Dashboard, DashboardWithCounts, CreateDashboardDto, UpdateDashboardDto, LayoutItem, DashboardExport, ExportedWidget, WidgetType, DataSourceType } from '@dashboard/shared';

export const dashboardsRouter = Router();

interface DbDashboard {
  id: number;
  name: string;
  position: number;
  layout: string;
  created_at: string;
  updated_at: string;
}

interface DbWidgetCount {
  dashboard_id: number;
  widget_count: number;
}

interface DbWidget {
  id: number;
  dashboard_id: number;
  type: string;
  title: string;
  data_source_id: number;
  config: string;
  refresh_interval: number;
}

interface DbDataSource {
  id: number;
  type: string;
}

function toApiDashboard(row: DbDashboard): Dashboard {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    layout: JSON.parse(row.layout || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Get all dashboards with widget counts
dashboardsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT d.*,
        (SELECT COUNT(*) FROM widgets w WHERE w.dashboard_id = d.id) as widget_count
      FROM dashboards d
      ORDER BY d.position ASC, d.id ASC
    `).all() as (DbDashboard & { widget_count: number })[];

    const dashboards: DashboardWithCounts[] = rows.map(row => ({
      ...toApiDashboard(row),
      widgetCount: row.widget_count,
      attentionCount: 0, // Will be populated by frontend from widget data
    }));

    const response: ApiResponse<DashboardWithCounts[]> = { success: true, data: dashboards };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});

// Get single dashboard
dashboardsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const row = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(id) as DbDashboard | undefined;

    if (!row) {
      const response: ApiResponse<null> = { success: false, error: 'Dashboard not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Dashboard> = { success: true, data: toApiDashboard(row) };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});

// Create dashboard
dashboardsRouter.post('/', (req: Request, res: Response) => {
  try {
    const dto: CreateDashboardDto = req.body;

    // Get max position for new dashboard
    const maxPos = db.prepare('SELECT MAX(position) as max_pos FROM dashboards').get() as { max_pos: number | null };
    const position = dto.position ?? (maxPos.max_pos ?? -1) + 1;

    const result = db.prepare(`
      INSERT INTO dashboards (name, position, layout)
      VALUES (?, ?, '[]')
    `).run(dto.name, position);

    const row = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(result.lastInsertRowid) as DbDashboard;

    const response: ApiResponse<Dashboard> = { success: true, data: toApiDashboard(row) };
    res.status(201).json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});

// Update dashboard
dashboardsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const dto: UpdateDashboardDto = req.body;

    const existing = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(id) as DbDashboard | undefined;
    if (!existing) {
      const response: ApiResponse<null> = { success: false, error: 'Dashboard not found' };
      res.status(404).json(response);
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (dto.name !== undefined) {
      updates.push('name = ?');
      values.push(dto.name);
    }
    if (dto.position !== undefined) {
      updates.push('position = ?');
      values.push(dto.position);
    }
    if (dto.layout !== undefined) {
      updates.push('layout = ?');
      values.push(JSON.stringify(dto.layout));
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE dashboards SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(id) as DbDashboard;
    const response: ApiResponse<Dashboard> = { success: true, data: toApiDashboard(row) };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});

// Delete dashboard
dashboardsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    // Check if it's the last dashboard
    const count = db.prepare('SELECT COUNT(*) as count FROM dashboards').get() as { count: number };
    if (count.count <= 1) {
      const response: ApiResponse<null> = { success: false, error: 'Cannot delete the last dashboard' };
      res.status(400).json(response);
      return;
    }

    const existing = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(id) as DbDashboard | undefined;
    if (!existing) {
      const response: ApiResponse<null> = { success: false, error: 'Dashboard not found' };
      res.status(404).json(response);
      return;
    }

    // Delete dashboard (widgets will be cascade deleted)
    db.prepare('DELETE FROM dashboards WHERE id = ?').run(id);

    const response: ApiResponse<null> = { success: true, message: 'Dashboard deleted' };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});

// Reorder dashboards
dashboardsRouter.post('/reorder', (req: Request, res: Response) => {
  try {
    const { order } = req.body as { order: number[] };

    const updateStmt = db.prepare('UPDATE dashboards SET position = ? WHERE id = ?');
    const transaction = db.transaction(() => {
      order.forEach((id, index) => {
        updateStmt.run(index, id);
      });
    });
    transaction();

    const rows = db.prepare('SELECT * FROM dashboards ORDER BY position ASC').all() as DbDashboard[];
    const dashboards = rows.map(toApiDashboard);

    const response: ApiResponse<Dashboard[]> = { success: true, data: dashboards };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});

// Export dashboard
dashboardsRouter.get('/:id/export', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    const dashboard = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(id) as DbDashboard | undefined;
    if (!dashboard) {
      const response: ApiResponse<null> = { success: false, error: 'Dashboard not found' };
      res.status(404).json(response);
      return;
    }

    const widgets = db.prepare(`
      SELECT w.*, ds.type as data_source_type
      FROM widgets w
      JOIN data_sources ds ON w.data_source_id = ds.id
      WHERE w.dashboard_id = ?
    `).all(id) as (DbWidget & { data_source_type: string })[];

    const layout: LayoutItem[] = JSON.parse(dashboard.layout || '[]');

    const exportedWidgets: ExportedWidget[] = widgets.map(w => {
      const layoutItem = layout.find(l => l.i === w.id.toString());
      return {
        type: w.type as WidgetType,
        title: w.title,
        dataSourceType: w.data_source_type as DataSourceType,
        config: JSON.parse(w.config || '{}'),
        refreshInterval: w.refresh_interval,
        layout: {
          x: layoutItem?.x ?? 0,
          y: layoutItem?.y ?? 0,
          w: layoutItem?.w ?? 4,
          h: layoutItem?.h ?? 3,
        },
      };
    });

    const exportData: DashboardExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      dashboard: {
        name: dashboard.name,
      },
      widgets: exportedWidgets,
    };

    const response: ApiResponse<DashboardExport> = { success: true, data: exportData };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});

// Import dashboard
dashboardsRouter.post('/import', (req: Request, res: Response) => {
  try {
    const importData: DashboardExport = req.body;

    if (!importData.version || !importData.dashboard || !importData.widgets) {
      const response: ApiResponse<null> = { success: false, error: 'Invalid import format' };
      res.status(400).json(response);
      return;
    }

    // Get max position for new dashboard
    const maxPos = db.prepare('SELECT MAX(position) as max_pos FROM dashboards').get() as { max_pos: number | null };
    const position = (maxPos.max_pos ?? -1) + 1;

    // Create dashboard
    const dashboardResult = db.prepare(`
      INSERT INTO dashboards (name, position, layout)
      VALUES (?, ?, '[]')
    `).run(importData.dashboard.name, position);

    const dashboardId = dashboardResult.lastInsertRowid as number;

    // Create widgets and build layout
    const layoutItems: LayoutItem[] = [];
    const insertWidget = db.prepare(`
      INSERT INTO widgets (dashboard_id, type, title, data_source_id, config, refresh_interval)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const widget of importData.widgets) {
      // Find matching data source by type
      const dataSource = db.prepare('SELECT id FROM data_sources WHERE type = ?').get(widget.dataSourceType) as DbDataSource | undefined;

      if (!dataSource) {
        console.warn(`No data source found for type: ${widget.dataSourceType}, skipping widget`);
        continue;
      }

      const result = insertWidget.run(
        dashboardId,
        widget.type,
        widget.title,
        dataSource.id,
        JSON.stringify(widget.config),
        widget.refreshInterval
      );

      layoutItems.push({
        i: result.lastInsertRowid.toString(),
        x: widget.layout.x,
        y: widget.layout.y,
        w: widget.layout.w,
        h: widget.layout.h,
        minW: 2,
        minH: 2,
      });
    }

    // Update dashboard with layout
    db.prepare('UPDATE dashboards SET layout = ? WHERE id = ?').run(
      JSON.stringify(layoutItems),
      dashboardId
    );

    const row = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(dashboardId) as DbDashboard;
    const response: ApiResponse<Dashboard> = { success: true, data: toApiDashboard(row) };
    res.status(201).json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});
