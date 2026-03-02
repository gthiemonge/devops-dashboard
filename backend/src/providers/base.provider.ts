export interface ProviderConfig {
  baseUrl: string;
  username?: string;
  password?: string;
}

export abstract class BaseProvider {
  protected config: ProviderConfig;

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

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return this.parseResponse<T>(text);
  }

  protected parseResponse<T>(text: string): T {
    return JSON.parse(text) as T;
  }

  abstract healthCheck(): Promise<boolean>;
}
