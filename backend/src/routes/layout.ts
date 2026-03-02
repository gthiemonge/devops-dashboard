import { Router } from 'express';
import db from '../db/database.js';
import type { Layout, UpdateLayoutDto, ApiResponse } from '@dashboard/shared';

export const layoutRouter = Router();

interface DbLayout {
  id: number;
  name: string;
  items: string;
  created_at: string;
  updated_at: string;
}

function mapToLayout(row: DbLayout): Layout {
  return {
    id: row.id,
    name: row.name,
    items: JSON.parse(row.items),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

layoutRouter.get('/', (_req, res) => {
  const row = db.prepare('SELECT * FROM layouts WHERE id = 1').get() as DbLayout | undefined;
  if (!row) {
    const response: ApiResponse<null> = { success: false, error: 'Layout not found' };
    res.status(404).json(response);
    return;
  }
  const response: ApiResponse<Layout> = { success: true, data: mapToLayout(row) };
  res.json(response);
});

layoutRouter.put('/', (req, res) => {
  const { name, items } = req.body as UpdateLayoutDto;
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (name) {
    updates.push('name = ?');
    values.push(name);
  }
  if (items) {
    updates.push('items = ?');
    values.push(JSON.stringify(items));
  }

  if (updates.length === 0) {
    const response: ApiResponse<null> = { success: false, error: 'No fields to update' };
    res.status(400).json(response);
    return;
  }

  updates.push("updated_at = datetime('now')");
  values.push(1);

  db.prepare(`UPDATE layouts SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare('SELECT * FROM layouts WHERE id = 1').get() as DbLayout;
  const response: ApiResponse<Layout> = { success: true, data: mapToLayout(row) };
  res.json(response);
});
