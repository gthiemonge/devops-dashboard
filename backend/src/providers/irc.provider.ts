import { logApiCall } from '../services/logger.service.js';
import type { IrcMessage } from '@dashboard/shared';

export interface IrcProviderConfig {
  baseUrl: string;
  cache?: {
    getOrSet: <T>(key: string, fn: () => Promise<T>, ttl?: number) => Promise<T>;
  };
}

export class IrcProvider {
  private config: IrcProviderConfig;
  private readonly serviceName = 'irc' as const;

  constructor(config: IrcProviderConfig) {
    this.config = config;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseHtmlMessages(html: string, channel: string, date: string): IrcMessage[] {
    const messages: IrcMessage[] = [];

    // Match regular messages: <tr id="..."><th class="nick" style="background: #color">nick</th><td class="text"...>message</td><td class="time">...HH:MM...</td></tr>
    const messageRegex = /<tr id="([^"]+)">\s*<th class="nick"[^>]*style="background:\s*([^"]+)"[^>]*>([^<]+)<\/th>\s*<td class="text"[^>]*>(.+?)<\/td>\s*<td[^>]*>.*?class="time"[^>]*>(\d{2}:\d{2})<\/a><\/td><\/tr>/gs;

    let match;
    while ((match = messageRegex.exec(html)) !== null) {
      const [, id, color, nick, rawMessage, time] = match;

      // Clean message: remove HTML tags, decode entities
      const message = rawMessage
        .replace(/<a[^>]*href="([^"]*)"[^>]*>.*?<\/a>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim();

      // Extract timestamp from id (format: t2026-03-02T14:30:44)
      const timestampMatch = id.match(/t(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      const timestamp = timestampMatch ? timestampMatch[1] : `${date}T${time}:00`;

      messages.push({
        id,
        timestamp,
        time,
        nick: nick.trim(),
        message,
        color: color.trim(),
        type: 'message',
        date,
      });
    }

    // Match action messages (like /me)
    const actionRegex = /<tr id="([^"]+)">\s*<td class="action"[^>]*>\*\s*([^\s]+)\s+(.+?)<\/td>\s*<td[^>]*>.*?class="time"[^>]*>(\d{2}:\d{2})<\/a><\/td><\/tr>/gs;

    while ((match = actionRegex.exec(html)) !== null) {
      const [, id, nick, message, time] = match;
      const timestampMatch = id.match(/t(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      const timestamp = timestampMatch ? timestampMatch[1] : `${date}T${time}:00`;

      messages.push({
        id,
        timestamp,
        time,
        nick: nick.trim(),
        message: message.replace(/<[^>]+>/g, '').trim(),
        color: '#666',
        type: 'action',
        date,
      });
    }

    return messages;
  }

  private async fetchDayLogs(channel: string, dateStr: string): Promise<IrcMessage[]> {
    const channelEncoded = encodeURIComponent(`#${channel}`);
    const channelWithHash = `%23${channel}`;
    const filename = `${channelWithHash}.${dateStr}.log.html`;
    const url = `${this.config.baseUrl}/${channelEncoded}/${filename}`;

    const startTime = Date.now();
    let status: 'success' | 'error' = 'success';
    let statusCode: number | undefined;
    let errorMsg: string | undefined;

    try {
      const response = await fetch(url);
      statusCode = response.status;

      if (response.ok) {
        const html = await response.text();
        return this.parseHtmlMessages(html, channel, dateStr);
      } else if (response.status !== 404) {
        status = 'error';
        errorMsg = `HTTP ${response.status}`;
      }
      return [];
    } catch (err) {
      status = 'error';
      errorMsg = (err as Error).message;
      return [];
    } finally {
      const duration = Date.now() - startTime;
      logApiCall({
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        method: 'GET',
        url,
        duration,
        status,
        statusCode,
        error: errorMsg,
      });
    }
  }

  async getMessages(channel: string, minMessages: number = 20): Promise<{ messages: IrcMessage[]; dates: string[] }> {
    const allMessages: IrcMessage[] = [];
    const dates: string[] = [];

    // Start with today and go backwards
    const today = new Date();
    const todayStr = this.formatDate(today);
    let currentDate = new Date(today);
    let daysChecked = 0;
    const maxDays = 5; // Don't go back more than 5 days

    // Cache TTLs: 5 minutes for today, 1 day for previous days
    const TODAY_CACHE_TTL = 300;      // 5 minutes
    const PAST_DAY_CACHE_TTL = 86400; // 1 day

    while (allMessages.length < minMessages && daysChecked < maxDays) {
      const dateStr = this.formatDate(currentDate);
      const isToday = dateStr === todayStr;
      const cacheTTL = isToday ? TODAY_CACHE_TTL : PAST_DAY_CACHE_TTL;
      const cacheKey = `irc:day:${channel}:${dateStr}`;

      let messages: IrcMessage[];

      if (this.config.cache) {
        messages = await this.config.cache.getOrSet(
          cacheKey,
          () => this.fetchDayLogs(channel, dateStr),
          cacheTTL
        );
      } else {
        messages = await this.fetchDayLogs(channel, dateStr);
      }

      if (messages.length > 0) {
        allMessages.unshift(...messages); // Add older messages at the beginning
        dates.unshift(dateStr);
      }

      currentDate.setDate(currentDate.getDate() - 1);
      daysChecked++;
    }

    // Sort by timestamp (most recent last) and take the last N messages
    allMessages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Return the most recent messages up to minMessages
    const recentMessages = allMessages.slice(-minMessages);

    return { messages: recentMessages, dates };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.config.baseUrl);
      return response.ok;
    } catch {
      return false;
    }
  }
}
