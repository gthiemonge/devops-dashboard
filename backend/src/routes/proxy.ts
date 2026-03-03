import { Router, Request, Response } from 'express';
import db from '../db/database.js';
import { GerritProvider, ZuulProvider, IrcProvider, LaunchpadProvider } from '../providers/index.js';
import { cacheService } from '../services/cache.service.js';
import type { ApiResponse, GerritChange, ZuulBuild, IrcMessage, LaunchpadBugWithTask, LaunchpadBugStatus } from '@dashboard/shared';

export const proxyRouter = Router();

interface DbDataSource {
  id: number;
  name: string;
  type: string;
  base_url: string;
}

interface DbCredential {
  username: string;
  password: string;
}

function getDataSource(id: number): DbDataSource | undefined {
  return db.prepare('SELECT * FROM data_sources WHERE id = ?').get(id) as DbDataSource | undefined;
}

function getCredential(dataSourceId: number): DbCredential | undefined {
  return db.prepare('SELECT username, password FROM credentials WHERE data_source_id = ?').get(dataSourceId) as DbCredential | undefined;
}

proxyRouter.get('/gerrit/changes', async (req: Request, res: Response) => {
  try {
    const dataSourceId = parseInt(req.query.dataSourceId as string) || 1;
    const query = req.query.q as string || 'status:open';
    const limit = parseInt(req.query.n as string) || 10;

    const dataSource = getDataSource(dataSourceId);
    if (!dataSource || dataSource.type !== 'gerrit') {
      const response: ApiResponse<null> = { success: false, error: 'Gerrit data source not found' };
      res.status(404).json(response);
      return;
    }

    const credential = getCredential(dataSourceId);
    const provider = new GerritProvider({
      baseUrl: dataSource.base_url,
      username: credential?.username,
      password: credential?.password,
    });

    const cacheKey = `gerrit:changes:${dataSourceId}:${query}:${limit}`;
    const changes = await cacheService.getOrSet<GerritChange[]>(cacheKey, () =>
      provider.getChanges(query, { limit })
    );

    const response: ApiResponse<GerritChange[]> = { success: true, data: changes };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});

proxyRouter.get('/zuul/builds', async (req: Request, res: Response) => {
  try {
    const dataSourceId = parseInt(req.query.dataSourceId as string) || 2;
    const project = req.query.project as string;
    const pipeline = req.query.pipeline as string;
    const result = req.query.result as string;
    const limit = parseInt(req.query.limit as string) || 10;

    const dataSource = getDataSource(dataSourceId);
    if (!dataSource || dataSource.type !== 'zuul') {
      const response: ApiResponse<null> = { success: false, error: 'Zuul data source not found' };
      res.status(404).json(response);
      return;
    }

    const provider = new ZuulProvider({ baseUrl: dataSource.base_url });

    const cacheKey = `zuul:builds:${dataSourceId}:${project}:${pipeline}:${result}:${limit}`;
    const builds = await cacheService.getOrSet<ZuulBuild[]>(cacheKey, () =>
      provider.getBuilds({ project, pipeline, result, limit })
    );

    const response: ApiResponse<ZuulBuild[]> = { success: true, data: builds };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});

proxyRouter.get('/irc/messages', async (req: Request, res: Response) => {
  try {
    const dataSourceId = parseInt(req.query.dataSourceId as string) || 3;
    const channel = req.query.channel as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!channel) {
      const response: ApiResponse<null> = { success: false, error: 'Channel parameter is required' };
      res.status(400).json(response);
      return;
    }

    const dataSource = getDataSource(dataSourceId);
    if (!dataSource || dataSource.type !== 'irc') {
      const response: ApiResponse<null> = { success: false, error: 'IRC data source not found' };
      res.status(404).json(response);
      return;
    }

    // Pass cache service to provider for per-day caching
    // Today's logs: 5 minutes, previous days: 1 day
    const provider = new IrcProvider({
      baseUrl: dataSource.base_url,
      cache: cacheService,
    });

    const result = await provider.getMessages(channel, limit);

    const response: ApiResponse<{ messages: IrcMessage[]; dates: string[] }> = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});

proxyRouter.get('/launchpad/bugs', async (req: Request, res: Response) => {
  try {
    const dataSourceId = parseInt(req.query.dataSourceId as string) || 4;
    const project = req.query.project as string;
    const statusesParam = req.query.statuses as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as 'id' | 'status' | 'importance') || 'id';
    const fetchTags = req.query.fetchTags === 'true';

    if (!project) {
      const response: ApiResponse<null> = { success: false, error: 'Project parameter is required' };
      res.status(400).json(response);
      return;
    }

    const dataSource = getDataSource(dataSourceId);
    if (!dataSource || dataSource.type !== 'launchpad') {
      const response: ApiResponse<null> = { success: false, error: 'Launchpad data source not found' };
      res.status(404).json(response);
      return;
    }

    const provider = new LaunchpadProvider({ baseUrl: dataSource.base_url });

    const statuses = statusesParam
      ? (statusesParam.split(',') as LaunchpadBugStatus[])
      : undefined;

    const cacheKey = `launchpad:bugs:${dataSourceId}:${project}:${statusesParam || 'default'}:${sortBy}:${limit}:${fetchTags}`;

    const bugs = await cacheService.getOrSet<LaunchpadBugWithTask[]>(cacheKey, () =>
      provider.getBugTasks({ project, statuses, limit, sortBy, fetchTags })
    );

    const response: ApiResponse<LaunchpadBugWithTask[]> = { success: true, data: bugs };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<null> = { success: false, error: (err as Error).message };
    res.status(500).json(response);
  }
});
