import { Router } from 'express';
import db from '../db/database.js';
import type { Credential, CreateCredentialDto, UpdateCredentialDto, ApiResponse } from '@dashboard/shared';

export const credentialsRouter = Router();

interface DbCredential {
  id: number;
  data_source_id: number;
  username: string;
  password: string | null;
  created_at: string;
  updated_at: string;
}

function mapToCredential(row: DbCredential): Credential {
  return {
    id: row.id,
    dataSourceId: row.data_source_id,
    username: row.username,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

credentialsRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM credentials').all() as DbCredential[];
  const credentials = rows.map(mapToCredential);
  const response: ApiResponse<Credential[]> = { success: true, data: credentials };
  res.json(response);
});

credentialsRouter.get('/:dataSourceId', (req, res) => {
  const row = db.prepare('SELECT * FROM credentials WHERE data_source_id = ?').get(req.params.dataSourceId) as DbCredential | undefined;
  if (!row) {
    const response: ApiResponse<null> = { success: false, error: 'Credential not found' };
    res.status(404).json(response);
    return;
  }
  const response: ApiResponse<Credential> = { success: true, data: mapToCredential(row) };
  res.json(response);
});

credentialsRouter.post('/', (req, res) => {
  const { dataSourceId, username, password } = req.body as CreateCredentialDto;
  if (!dataSourceId || !username || !password) {
    const response: ApiResponse<null> = { success: false, error: 'Missing required fields' };
    res.status(400).json(response);
    return;
  }

  try {
    const result = db.prepare(
      'INSERT INTO credentials (data_source_id, username, password) VALUES (?, ?, ?)'
    ).run(dataSourceId, username, password);

    const row = db.prepare('SELECT * FROM credentials WHERE id = ?').get(result.lastInsertRowid) as DbCredential;
    const response: ApiResponse<Credential> = { success: true, data: mapToCredential(row) };
    res.status(201).json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(400).json(response);
  }
});

credentialsRouter.put('/:dataSourceId', (req, res) => {
  const { username, password } = req.body as UpdateCredentialDto;
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (username) {
    updates.push('username = ?');
    values.push(username);
  }
  if (password) {
    updates.push('password = ?');
    values.push(password);
  }

  if (updates.length === 0) {
    const response: ApiResponse<null> = { success: false, error: 'No fields to update' };
    res.status(400).json(response);
    return;
  }

  updates.push("updated_at = datetime('now')");
  values.push(parseInt(req.params.dataSourceId as string));

  const result = db.prepare(
    `UPDATE credentials SET ${updates.join(', ')} WHERE data_source_id = ?`
  ).run(...values);

  if (result.changes === 0) {
    const response: ApiResponse<null> = { success: false, error: 'Credential not found' };
    res.status(404).json(response);
    return;
  }

  const row = db.prepare('SELECT * FROM credentials WHERE data_source_id = ?').get(req.params.dataSourceId) as DbCredential;
  const response: ApiResponse<Credential> = { success: true, data: mapToCredential(row) };
  res.json(response);
});

credentialsRouter.delete('/:dataSourceId', (req, res) => {
  const result = db.prepare('DELETE FROM credentials WHERE data_source_id = ?').run(req.params.dataSourceId);
  if (result.changes === 0) {
    const response: ApiResponse<null> = { success: false, error: 'Credential not found' };
    res.status(404).json(response);
    return;
  }
  const response: ApiResponse<null> = { success: true, message: 'Credential deleted' };
  res.json(response);
});
