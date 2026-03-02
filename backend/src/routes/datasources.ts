import { Router } from 'express';
import db from '../db/database.js';
import type { DataSource, CreateDataSourceDto, UpdateDataSourceDto, ApiResponse } from '@dashboard/shared';

export const dataSourcesRouter = Router();

interface DbDataSource {
  id: number;
  name: string;
  type: string;
  base_url: string;
  created_at: string;
  updated_at: string;
}

function mapToDataSource(row: DbDataSource): DataSource {
  return {
    id: row.id,
    name: row.name,
    type: row.type as DataSource['type'],
    baseUrl: row.base_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

dataSourcesRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM data_sources ORDER BY name').all() as DbDataSource[];
  const dataSources = rows.map(mapToDataSource);
  const response: ApiResponse<DataSource[]> = { success: true, data: dataSources };
  res.json(response);
});

dataSourcesRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(req.params.id) as DbDataSource | undefined;
  if (!row) {
    const response: ApiResponse<null> = { success: false, error: 'Data source not found' };
    res.status(404).json(response);
    return;
  }
  const response: ApiResponse<DataSource> = { success: true, data: mapToDataSource(row) };
  res.json(response);
});

dataSourcesRouter.post('/', (req, res) => {
  const { name, type, baseUrl } = req.body as CreateDataSourceDto;
  if (!name || !type || !baseUrl) {
    const response: ApiResponse<null> = { success: false, error: 'Missing required fields' };
    res.status(400).json(response);
    return;
  }

  try {
    const result = db.prepare(
      'INSERT INTO data_sources (name, type, base_url) VALUES (?, ?, ?)'
    ).run(name, type, baseUrl);

    const row = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(result.lastInsertRowid) as DbDataSource;
    const response: ApiResponse<DataSource> = { success: true, data: mapToDataSource(row) };
    res.status(201).json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(400).json(response);
  }
});

dataSourcesRouter.put('/:id', (req, res) => {
  const { name, baseUrl } = req.body as UpdateDataSourceDto;
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (name) {
    updates.push('name = ?');
    values.push(name);
  }
  if (baseUrl) {
    updates.push('base_url = ?');
    values.push(baseUrl);
  }

  if (updates.length === 0) {
    const response: ApiResponse<null> = { success: false, error: 'No fields to update' };
    res.status(400).json(response);
    return;
  }

  updates.push("updated_at = datetime('now')");
  values.push(parseInt(req.params.id as string));

  const result = db.prepare(
    `UPDATE data_sources SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  if (result.changes === 0) {
    const response: ApiResponse<null> = { success: false, error: 'Data source not found' };
    res.status(404).json(response);
    return;
  }

  const row = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(req.params.id) as DbDataSource;
  const response: ApiResponse<DataSource> = { success: true, data: mapToDataSource(row) };
  res.json(response);
});

dataSourcesRouter.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM data_sources WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    const response: ApiResponse<null> = { success: false, error: 'Data source not found' };
    res.status(404).json(response);
    return;
  }
  const response: ApiResponse<null> = { success: true, message: 'Data source deleted' };
  res.json(response);
});
