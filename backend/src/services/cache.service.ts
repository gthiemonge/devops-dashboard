import NodeCache from 'node-cache';
import { config } from '../config/env.js';
import { logApiCall } from './logger.service.js';

class CacheService {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: config.cacheTtl,
      checkperiod: 60,
      useClones: true,
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    if (ttl !== undefined) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  del(key: string): number {
    return this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      const service = key.startsWith('gerrit') || key.startsWith('summary:gerrit') ? 'gerrit' : 'zuul';
      logApiCall({
        timestamp: new Date().toISOString(),
        service,
        method: 'GET',
        url: key,
        duration: 0,
        status: 'success',
        cached: true,
      });
      return Promise.resolve(cached);
    }
    return fetchFn().then((data) => {
      this.set(key, data, ttl);
      return data;
    });
  }
}

export const cacheService = new CacheService();
export default cacheService;
