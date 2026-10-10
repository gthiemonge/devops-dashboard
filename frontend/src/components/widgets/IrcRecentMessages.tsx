import { useEffect, useMemo, useState } from 'react';
import { useIrcMessages } from '../../hooks/useIrcMessages';
import { useDashboardStore } from '../../store/dashboardStore';
import { Icon, NewDot, WidgetEmpty, WidgetError, WidgetLoading } from '../ui';
import { formatAbsolute } from '../../lib/format';
import { getNewItemsCutoff } from '../../lib/newItems';
import { cx } from '../../lib/cx';
import { buildIrcItems, isBotNick, messageDate, splitUrls, summarizeBotMessage, type IrcEntry } from './irc/ircItems';
import type { Widget } from '@dashboard/shared';

interface IrcRecentMessagesProps {
  widget: Widget;
}

const LINK = 'text-fg-2 underline decoration-line-strong underline-offset-2 hover:text-accent hover:decoration-current';
/** Right-hand timestamp column, shared by every row so times line up. */
const TIME = 'w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-fg-3';

function hhmm(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function Time({ at, className }: { at: Date; className?: string }) {
  return (
    <time dateTime={at.toISOString()} title={formatAbsolute(at)} className={cx(TIME, className)}>
      {hhmm(at)}
    </time>
  );
}

function MessageText({ text }: { text: string }) {
  return (
    <>
      {splitUrls(text).map((part, i) =>
        part.url ? (
          <a key={i} href={part.url} target="_blank" rel="noopener noreferrer" className={cx(LINK, 'break-all')}>
            {part.url.length > 60 ? `${part.url.slice(0, 57)}…` : part.url}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

function DateDivider({ day }: { day: Date }) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const label = same(day, today)
    ? 'Today'
    : same(day, yesterday)
      ? 'Yesterday'
      : day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div className="flex items-center gap-2 px-2 pt-2 pb-1" role="separator" aria-label={label}>
      <span className="shrink-0 text-[11px] font-medium text-fg-3">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function HumanMessage({ entry, showNick, isNew }: { entry: IrcEntry; showNick: boolean; isNew: boolean }) {
  const { msg, at } = entry;
  if (msg.type === 'action') {
    return (
      <div className="flex items-start gap-2 px-2 py-1">
        <div className="min-w-0 flex-1 text-[13px] leading-5 text-fg-2 italic [overflow-wrap:anywhere]">
          {isNew && <NewDot className="mr-1.5 align-middle" />}
          <span className="font-semibold not-italic">* {msg.nick}</span> <MessageText text={msg.message} />
        </div>
        <Time at={at} className="leading-5" />
      </div>
    );
  }
  return (
    <div className={cx('flex items-start gap-2 px-2', showNick ? 'pt-1.5 pb-0.5' : 'py-0.5')}>
      <div className="min-w-0 flex-1">
        {showNick && (
          <div className="flex min-w-0 items-center gap-1.5 text-[12px] leading-4 font-semibold text-fg-2">
            {isNew && <NewDot />}
            <span className="truncate">{msg.nick}</span>
          </div>
        )}
        <div className="text-[13px] leading-5 text-fg [overflow-wrap:anywhere]">
          {isNew && !showNick && <NewDot className="mr-1.5 align-middle" />}
          <MessageText text={msg.message} />
        </div>
      </div>
      <Time at={at} className={showNick ? 'leading-4' : 'leading-5'} />
    </div>
  );
}

/** One compact, muted, single-line bot message (e.g. a Gerrit event) with its change link. */
function BotLine({ entry, indent }: { entry: IrcEntry; indent?: boolean }) {
  const { msg, at } = entry;
  const s = summarizeBotMessage(msg.message);
  return (
    <div className={cx('flex items-center gap-2 py-0.5 pr-2 text-[11px] leading-4 text-fg-3', indent ? 'pl-7' : 'pl-2')}>
      <span className="min-w-0 flex-1 truncate" title={`${msg.nick}: ${msg.message}`}>
        {s.text}
      </span>
      {s.url && (
        <a href={s.url} target="_blank" rel="noopener noreferrer" className={cx(LINK, 'min-w-[8ch] shrink-0 text-right font-mono')}>
          {s.linkLabel}
        </a>
      )}
      <Time at={at} />
    </div>
  );
}

/** Consecutive bot messages, collapsed by default into "N patch events". */
function BotGroup({ entries }: { entries: IrcEntry[] }) {
  const [open, setOpen] = useState(false);
  if (entries.length === 1) return <BotLine entry={entries[0]} />;

  const allGerrit = entries.every((e) => e.msg.nick.toLowerCase() === 'opendevreview');
  const label = `${entries.length} ${allGerrit ? 'patch events' : 'bot messages'}`;
  const projects = [...new Set(entries.map((e) => summarizeBotMessage(e.msg.message).project).filter(Boolean))];
  const last = entries[entries.length - 1];

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Hide bot messages' : 'Show bot messages'}
        className="flex w-full items-center gap-2 px-2 py-1 text-left text-[11px] leading-4 text-fg-3 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-offset-[-2px]"
      >
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={12} className="shrink-0" />
        <span className="shrink-0 font-medium text-fg-2">{label}</span>
        {projects.length > 0 && (
          <span className="min-w-0 flex-1 truncate" title={projects.join(', ')}>
            {projects.join(', ')}
          </span>
        )}
        {projects.length === 0 && <span className="flex-1" />}
        <Time at={last.at} />
      </button>
      {open && entries.map((e) => <BotLine key={e.msg.id || e.msg.timestamp} entry={e} indent />)}
    </div>
  );
}

export function IrcRecentMessages({ widget }: IrcRecentMessagesProps) {
  const channel = (widget.config.channel as string) || '';
  const limit = (widget.config.limit as number) || 20;
  const reportWidgetSignals = useDashboardStore((s) => s.reportWidgetSignals);
  const newItemsHours = useDashboardStore((s) => s.newItemsHours);

  const { data, isLoading, error, refetch } = useIrcMessages({
    dataSourceId: widget.dataSourceId,
    channel,
    limit,
    refreshInterval: widget.refreshInterval,
    enabled: !!channel,
  });

  const messages = data?.messages;
  const items = useMemo(() => buildIrcItems(messages ?? []), [messages]);
  const newCutoff = getNewItemsCutoff(newItemsHours);
  const isNew = (e: IrcEntry) => e.at >= newCutoff;
  // Only human messages count as new: bot lines are Gerrit noise.
  const newCount = (messages ?? []).filter((m) => !isBotNick(m.nick) && messageDate(m) >= newCutoff).length;
  const total = messages?.length ?? 0;

  useEffect(() => {
    if (!messages) return;
    reportWidgetSignals(widget.id, { total, truncated: false, action: 0, newCount });
  }, [messages, total, newCount, widget.id, reportWidgetSignals]);

  if (!channel) return <WidgetEmpty icon="settings">Configure a channel</WidgetEmpty>;
  if (isLoading) return <WidgetLoading />;
  if (error) return <WidgetError message="Couldn't load IRC logs" error={error} onRetry={() => void refetch()} />;
  if (!messages || messages.length === 0) return <WidgetEmpty>No recent messages</WidgetEmpty>;

  return (
    <div className="flex flex-col pb-1">
      {items.map((item) => {
        switch (item.kind) {
          case 'divider':
            return <DateDivider key={item.key} day={item.day} />;
          case 'bots':
            return <BotGroup key={item.key} entries={item.entries} />;
          case 'human':
            return <HumanMessage key={item.key} entry={item.entry} showNick={item.showNick} isNew={isNew(item.entry)} />;
        }
      })}
    </div>
  );
}
