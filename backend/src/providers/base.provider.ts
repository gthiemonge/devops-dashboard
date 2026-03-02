import { logApiCall } from '../services/logger.service.js';

export interface ProviderConfig {
  baseUrl: string;
  username?: string;
  password?: string;
}

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected abstract serviceName: 'gerrit' | 'zuul';

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  protected async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: HeadersInit = {
      'Accept': 'application/json',
      ...options.headers,
    };

    if (this.config.username && this.config.password) {
      const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      (headers as Record<string, string>)['Authorization'] = `Basic ${auth}`;
    }

    const startTime = Date.now();
    let status: 'success' | 'error' = 'success';
    let statusCode: number | undefined;
    let errorMsg: string | undefined;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      statusCode = response.status;

      if (!response.ok) {
        status = 'error';
        errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      const text = await response.text();
      return this.parseResponse<T>(text);
    } catch (err) {
      status = 'error';
      errorMsg = (err as Error).message;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      logApiCall({
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        method: options.method || 'GET',
        url,
        duration,
        status,
        statusCode,
        error: errorMsg,
      });
    }
  }

  protected parseResponse<T>(text: string): T {
    return JSON.parse(text) as T;
  }

  abstract healthCheck(): Promise<boolean>;
}
