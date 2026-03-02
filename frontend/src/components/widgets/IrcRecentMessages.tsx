import { useIrcMessages } from '../../hooks/useIrcMessages';
import type { Widget, IrcMessage } from '@dashboard/shared';

interface IrcRecentMessagesProps {
  widget: Widget;
}

function formatTime(timestamp: string, time: string): string {
  const date = new Date(timestamp.includes('T') ? timestamp : `${timestamp}`);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 60) return time;
  if (diffHours < 24) return time;

  const dateStr = timestamp.split('T')[0];
  return `${dateStr.slice(5)} ${time}`;
}

function getAvatarColor(nick: string): string {
  let hash = 0;
  for (let i = 0; i < nick.length; i++) {
    hash = nick.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 50%, 50%)`;
}

function getInitials(nick: string): string {
  return nick.slice(0, 2).toUpperCase();
}

function renderMessageContent(message: string): JSX.Element {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = message.split(urlRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (urlRegex.test(part)) {
          urlRegex.lastIndex = 0;
          const displayUrl = part.length > 50 ? part.slice(0, 47) + '...' : part;
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 hover:underline"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {displayUrl}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MessageBubble({ msg, isConsecutive }: { msg: IrcMessage; isConsecutive: boolean }) {
  const avatarColor = getAvatarColor(msg.nick);
  const isBot = msg.nick.toLowerCase().includes('bot') || msg.nick === 'opendevreview';
  const isAction = msg.type === 'action';

  if (isAction) {
    return (
      <div className="flex items-center gap-2 py-0.5 px-2 text-[#7d8590] text-[10px] italic font-mono">
        <span className="text-[#484f58]">*</span>
        <span style={{ color: avatarColor }}>{msg.nick}</span>
        <span>{msg.message}</span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${isConsecutive ? 'mt-0' : 'mt-1.5'} group px-1`}>
      {!isConsecutive ? (
        <div
          className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 font-mono"
          style={{ backgroundColor: avatarColor }}
        >
          {getInitials(msg.nick)}
        </div>
      ) : (
        <div className="w-5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        {!isConsecutive && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className={`text-[10px] font-mono font-medium ${isBot ? 'text-[#484f58]' : ''}`}
              style={{ color: isBot ? undefined : avatarColor }}
            >
              {msg.nick}
            </span>
            <span className="text-[9px] text-[#484f58] font-mono">
              {formatTime(msg.timestamp, msg.time)}
            </span>
          </div>
        )}
        <div
          className={`text-xs leading-relaxed ${
            isBot ? 'text-[#484f58]' : 'text-[#e6edf3]'
          }`}
        >
          {renderMessageContent(msg.message)}
        </div>
      </div>
      {isConsecutive && (
        <span className="text-[9px] text-[#30363d] group-hover:text-[#484f58] transition-colors self-center font-mono">
          {msg.time}
        </span>
      )}
    </div>
  );
}

function DateDivider({ date }: { date: string }) {
  const dateObj = new Date(date + 'T12:00:00');
  const formatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex items-center gap-2 my-2 px-1">
      <div className="flex-1 h-px bg-[#21262d]" />
      <span className="text-[9px] text-[#484f58] font-mono uppercase tracking-wider">{formatted}</span>
      <div className="flex-1 h-px bg-[#21262d]" />
    </div>
  );
}

export function IrcRecentMessages({ widget }: IrcRecentMessagesProps) {
  const channel = (widget.config.channel as string) || '';
  const limit = (widget.config.limit as number) || 20;

  const { data, isLoading, error } = useIrcMessages({
    dataSourceId: widget.dataSourceId,
    channel,
    limit,
    refreshInterval: widget.refreshInterval,
    enabled: !!channel,
  });

  if (!channel) {
    return <div className="text-[#7d8590] text-xs font-mono">Configure a channel</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[#7d8590] text-xs">
        <div className="w-3 h-3 border border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="font-mono">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-xs">
        <span className="font-mono">Error: {(error as Error).message}</span>
      </div>
    );
  }

  const messages = data?.messages || [];

  if (messages.length === 0) {
    return <div className="text-[#7d8590] text-xs font-mono">No recent messages</div>;
  }

  let currentDate = '';
  let lastNick = '';

  return (
    <div className="space-y-0">
      {messages.map((msg, idx) => {
        const showDateDivider = msg.date !== currentDate;
        const isConsecutive = !showDateDivider && msg.nick === lastNick && msg.type === 'message';

        currentDate = msg.date;
        lastNick = msg.nick;

        return (
          <div key={msg.id || idx}>
            {showDateDivider && <DateDivider date={msg.date} />}
            <MessageBubble msg={msg} isConsecutive={isConsecutive} />
          </div>
        );
      })}
    </div>
  );
}
