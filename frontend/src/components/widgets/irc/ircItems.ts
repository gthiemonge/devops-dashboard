/**
 * Turns the flat IRC message list into display items for the IRC widget:
 * date dividers, human messages, and runs of consecutive bot messages.
 */
import type { IrcMessage } from '@dashboard/shared';

/** Gerrit/meeting bots on OFTC/opendev channels, plus any nick ending in "bot". */
const BOT_NICKS = new Set(['opendevreview', 'opendevmeet', 'opendevstatus']);

export function isBotNick(nick: string): boolean {
  const n = nick.toLowerCase();
  return BOT_NICKS.has(n) || n.endsWith('bot');
}

/** Log timestamps are UTC without a zone ("2026-10-10T08:45:01"). */
export function messageDate(msg: IrcMessage): Date {
  const ts = msg.timestamp;
  const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : `${ts}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(`${msg.date}T${msg.time}:00Z`) : d;
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface IrcEntry {
  msg: IrcMessage;
  at: Date;
}

export type IrcItem =
  | { kind: 'divider'; key: string; day: Date }
  | { kind: 'human'; key: string; entry: IrcEntry; showNick: boolean }
  | { kind: 'bots'; key: string; entries: IrcEntry[] };

export function buildIrcItems(messages: IrcMessage[]): IrcItem[] {
  const items: IrcItem[] = [];
  let day = '';
  let lastHumanNick: string | null = null;
  let bots: IrcEntry[] | null = null;

  messages.forEach((msg, idx) => {
    const at = messageDate(msg);
    const entry: IrcEntry = { msg, at };
    const key = msg.id || `${msg.timestamp}-${idx}`;
    const dayKey = localDayKey(at);
    if (dayKey !== day) {
      day = dayKey;
      items.push({ kind: 'divider', key: `d-${dayKey}`, day: at });
      lastHumanNick = null;
      bots = null;
    }
    if (isBotNick(msg.nick)) {
      if (!bots) {
        bots = [];
        items.push({ kind: 'bots', key: `b-${key}`, entries: bots });
      }
      bots.push(entry);
      lastHumanNick = null;
      return;
    }
    bots = null;
    const showNick = msg.type !== 'message' || msg.nick !== lastHumanNick;
    items.push({ kind: 'human', key, entry, showNick });
    lastHumanNick = msg.type === 'message' ? msg.nick : null;
  });
  return items;
}

const URL_RE = /https?:\/\/\S+/g;

/** Splits text into plain parts and URLs. */
export function splitUrls(text: string): Array<{ text: string; url?: string }> {
  const parts: Array<{ text: string; url?: string }> = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: m[0], url: m[0] });
    last = start + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export interface BotSummary {
  /** Message without its URL, "openstack/" prefixes dropped. */
  text: string;
  url?: string;
  /** "#1009437" for Gerrit change URLs, else "link". */
  linkLabel?: string;
  /** Project of a Gerrit event ("octavia-dashboard"), if recognizable. */
  project?: string;
}

export function summarizeBotMessage(message: string): BotSummary {
  const url = message.match(URL_RE)?.[0];
  const text = message.replace(URL_RE, '').replace(/\bopenstack\//g, '').replace(/\s+/g, ' ').trim();
  const change = url?.match(/\/\+\/(\d+)/)?.[1];
  const project = message.match(/(?:proposed|Merged|merged|abandoned|restored)\s+([\w.-]+\/[\w.-]+)/)?.[1];
  return {
    text,
    url,
    linkLabel: url ? (change ? `#${change}` : 'link') : undefined,
    project: project?.replace(/^openstack\//, ''),
  };
}
