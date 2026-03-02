import { Router } from 'express';
import db from '../db/database.js';
import type { Widget, CreateWidgetDto, UpdateWidgetDto, ApiResponse } from '@dashboard/shared';

export const widgetsRouter = Router();

interface DbWidget {
  id: number;
  dashboard_id: number;
  type: string;
  title: string;
  data_source_id: number;
  config: string;
  refresh_interval: number;
  created_at: string;
  updated_at: string;
}

function mapToWidget(row: DbWidget): Widget {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    type: row.type as Widget['type'],
    title: row.title,
    dataSourceId: row.data_source_id,
    config: JSON.parse(row.config),
    refreshInterval: row.refresh_interval,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

widgetsRouter.get('/', (req, res) => {
  const dashboardId = req.query.dashboardId ? parseInt(req.query.dashboardId as string) : undefined;

  let rows: DbWidget[];
  if (dashboardId) {
    rows = db.prepare('SELECT * FROM widgets WHERE dashboard_id = ? ORDER BY id').all(dashboardId) as DbWidget[];
  } else {
    rows = db.prepare('SELECT * FROM widgets ORDER BY id').all() as DbWidget[];
  }

  const widgets = rows.map(mapToWidget);
  const response: ApiResponse<Widget[]> = { success: true, data: widgets };
  res.json(response);
});

widgetsRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM widgets WHERE id = ?').get(req.params.id) as DbWidget | undefined;
  if (!row) {
    const response: ApiResponse<null> = { success: false, error: 'Widget not found' };
    res.status(404).json(response);
    return;
  }
  const response: ApiResponse<Widget> = { success: true, data: mapToWidget(row) };
  res.json(response);
});

widgetsRouter.post('/', (req, res) => {
  const { dashboardId = 1, type, title, dataSourceId, config = {}, refreshInterval = 300 } = req.body as CreateWidgetDto;
  if (!type || !title || !dataSourceId) {
    const response: ApiResponse<null> = { success: false, error: 'Missing required fields' };
    res.status(400).json(response);
    return;
  }

  try {
    const result = db.prepare(
      'INSERT INTO widgets (dashboard_id, type, title, data_source_id, config, refresh_interval) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(dashboardId, type, title, dataSourceId, JSON.stringify(config), refreshInterval);

    const row = db.prepare('SELECT * FROM widgets WHERE id = ?').get(result.lastInsertRowid) as DbWidget;
    const response: ApiResponse<Widget> = { success: true, data: mapToWidget(row) };
    res.status(201).json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(400).json(response);
  }
});

widgetsRouter.put('/:id', (req, res) => {
  const { title, config, refreshInterval } = req.body as UpdateWidgetDto;
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (title) {
    updates.push('title = ?');
    values.push(title);
  }
  if (config) {
    updates.push('config = ?');
    values.push(JSON.stringify(config));
  }
  if (refreshInterval !== undefined) {
    updates.push('refresh_interval = ?');
    values.push(refreshInterval);
  }

  if (updates.length === 0) {
    const response: ApiResponse<null> = { success: false, error: 'No fields to update' };
    res.status(400).json(response);
    return;
  }

  updates.push("updated_at = datetime('now')");
  values.push(parseInt(req.params.id));

  const result = db.prepare(
    `UPDATE widgets SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  if (result.changes === 0) {
    const response: ApiResponse<null> = { success: false, error: 'Widget not found' };
    res.status(404).json(response);
    return;
  }

  const row = db.prepare('SELECT * FROM widgets WHERE id = ?').get(req.params.id) as DbWidget;
  const response: ApiResponse<Widget> = { success: true, data: mapToWidget(row) };
  res.json(response);
});

widgetsRouter.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM widgets WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    const response: ApiResponse<null> = { success: false, error: 'Widget not found' };
    res.status(404).json(response);
    return;
  }
  const response: ApiResponse<null> = { success: true, message: 'Widget deleted' };
  res.json(response);
});
