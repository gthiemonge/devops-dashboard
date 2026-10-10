import { describe, expect, it } from 'vitest';
import type { IrcMessage } from '@dashboard/shared';
import { buildIrcItems, isBotNick, messageDate } from './ircItems';

let seq = 0;

function msg(nick: string, timestamp: string, type: IrcMessage['type'] = 'message'): IrcMessage {
  return {
    id: `m${seq++}`,
    timestamp,
    time: timestamp.slice(11, 16),
    nick,
    message: 'hello',
    color: '',
    type,
    date: timestamp.slice(0, 10),
  };
}

describe('isBotNick', () => {
  it('recognizes opendev bots and nicks ending in "bot"', () => {
    expect(isBotNick('opendevreview')).toBe(true);
    expect(isBotNick('OpenDevMeet')).toBe(true);
    expect(isBotNick('zuulbot')).toBe(true);
    expect(isBotNick('gthiemonge')).toBe(false);
  });
});

describe('messageDate', () => {
  it('reads log timestamps as UTC', () => {
    expect(messageDate(msg('a', '2026-10-10T08:45:01')).toISOString()).toBe('2026-10-10T08:45:01.000Z');
  });
});

describe('buildIrcItems', () => {
  it('adds day dividers, groups consecutive bot lines and hides repeated nicks', () => {
    const items = buildIrcItems([
      msg('opendevreview', '2026-10-09T22:00:00'),
      msg('opendevreview', '2026-10-09T22:05:00'),
      msg('alice', '2026-10-10T08:00:00'),
      msg('alice', '2026-10-10T08:01:00'),
      msg('opendevreview', '2026-10-10T08:02:00'),
      msg('alice', '2026-10-10T08:03:00'),
    ]);
    expect(items.map((i) => (i.kind === 'human' ? `human:${i.showNick}` : i.kind === 'bots' ? `bots:${i.entries.length}` : i.kind))).toEqual([
      'divider',
      'bots:2',
      'divider',
      'human:true',
      'human:false',
      'bots:1',
      'human:true',
    ]);
  });
});
