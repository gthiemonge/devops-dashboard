import { logApiCall } from '../services/logger.service.js';
import type { IrcMessage } from '@dashboard/shared';

export interface IrcProviderConfig {
  baseUrl: string;
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

  async getMessages(channel: string, minMessages: number = 20): Promise<{ messages: IrcMessage[]; dates: string[] }> {
    const allMessages: IrcMessage[] = [];
    const dates: string[] = [];
    const channelEncoded = encodeURIComponent(`#${channel}`);

    // Start with today and go backwards
    const today = new Date();
    let currentDate = new Date(today);
    let daysChecked = 0;
    const maxDays = 14; // Don't go back more than 2 weeks

    while (allMessages.length < minMessages && daysChecked < maxDays) {
      const dateStr = this.formatDate(currentDate);
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
          const messages = this.parseHtmlMessages(html, channel, dateStr);

          if (messages.length > 0) {
            allMessages.unshift(...messages); // Add older messages at the beginning
            dates.unshift(dateStr);
          }
        } else if (response.status !== 404) {
          // 404 is expected for days with no activity
          status = 'error';
          errorMsg = `HTTP ${response.status}`;
        }
      } catch (err) {
        status = 'error';
        errorMsg = (err as Error).message;
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
