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

  /**
   * Drop entries expiring within `maxTtlSeconds` (the regular upstream data), keep the
   * long-lived ones (e.g. past IRC days, the Gerrit account). Returns the number dropped.
   */
  flushShortLived(maxTtlSeconds: number = config.cacheTtl): number {
    const limit = Date.now() + maxTtlSeconds * 1000;
    const keys = this.cache.keys().filter((key) => {
      const expiresAt = this.cache.getTtl(key);
      return expiresAt !== undefined && expiresAt !== 0 && expiresAt <= limit;
    });
    return this.cache.del(keys);
  }

  getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      let service: 'gerrit' | 'zuul' | 'irc' | 'launchpad' = 'zuul';
      if (key.startsWith('gerrit') || key.startsWith('summary:gerrit')) service = 'gerrit';
      else if (key.startsWith('irc')) service = 'irc';
      else if (key.startsWith('launchpad')) service = 'launchpad';
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
