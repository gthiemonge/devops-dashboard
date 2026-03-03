import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logsDir = join(__dirname, '../../logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

const logFile = join(logsDir, 'api-calls.log');

export interface ApiCallLog {
  timestamp: string;
  service: 'gerrit' | 'zuul' | 'irc' | 'launchpad';
  method: string;
  url: string;
  duration: number;
  status: 'success' | 'error';
  statusCode?: number;
  error?: string;
  cached?: boolean;
}

export function logApiCall(log: ApiCallLog): void {
  const line = JSON.stringify(log) + '\n';
  appendFileSync(logFile, line);

  const emoji = log.status === 'success' ? (log.cached ? '📦' : '✓') : '✗';
  const cacheInfo = log.cached ? ' [CACHED]' : '';
  console.log(
    `[${log.timestamp}] ${emoji} ${log.service.toUpperCase()} ${log.method} ${log.url} - ${log.duration}ms${cacheInfo}`
  );
}

export function getLogPath(): string {
  return logFile;
}
