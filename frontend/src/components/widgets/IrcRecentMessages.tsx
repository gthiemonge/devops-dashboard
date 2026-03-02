import { useIrcMessages } from '../../hooks/useIrcMessages';
import type { Widget, IrcMessage } from '@dashboard/shared';

interface IrcRecentMessagesProps {
  widget: Widget;
}

function formatTime(timestamp: string, time: string): string {
  // If timestamp includes full ISO date, use it for relative time
  const date = new Date(timestamp.includes('T') ? timestamp : `${timestamp}`);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 60) return time;
  if (diffHours < 24) return time;

  // Show date for older messages
  const dateStr = timestamp.split('T')[0];
  return `${dateStr.slice(5)} ${time}`; // MM-DD HH:MM
}

function getAvatarColor(nick: string, providedColor?: string): string {
  if (providedColor && providedColor !== '#666') {
    return providedColor;
  }
  // Generate consistent color from nick
  let hash = 0;
  for (let i = 0; i < nick.length; i++) {
    hash = nick.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 45%)`;
}

function getInitials(nick: string): string {
  return nick.slice(0, 2).toUpperCase();
}

function renderMessageContent(message: string): JSX.Element {
  // Convert URLs to links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = message.split(urlRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (urlRegex.test(part)) {
          // Reset regex lastIndex
          urlRegex.lastIndex = 0;
          const displayUrl = part.length > 60 ? part.slice(0, 57) + '...' : part;
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 hover:underline break-all"
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
  const avatarColor = getAvatarColor(msg.nick, msg.color);
  const isBot = msg.nick.toLowerCase().includes('bot') || msg.nick === 'opendevreview';
  const isAction = msg.type === 'action';

  if (isAction) {
    return (
      <div className="flex items-center gap-2 py-1 px-2 text-slate-400 text-xs italic">
        <span className="text-slate-500">*</span>
        <span style={{ color: avatarColor }}>{msg.nick}</span>
        <span>{msg.message}</span>
        <span className="text-slate-600 ml-auto text-[10px]">{msg.time}</span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${isConsecutive ? 'mt-0.5' : 'mt-2'} group`}>
      {!isConsecutive ? (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
          style={{ backgroundColor: avatarColor }}
        >
          {getInitials(msg.nick)}
        </div>
      ) : (
        <div className="w-7 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        {!isConsecutive && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className={`text-xs font-medium ${isBot ? 'text-slate-500' : ''}`}
              style={{ color: isBot ? undefined : avatarColor }}
            >
              {msg.nick}
            </span>
            <span className="text-[10px] text-slate-600">
              {formatTime(msg.timestamp, msg.time)}
            </span>
          </div>
        )}
        <div
          className={`text-sm text-slate-300 leading-relaxed ${
            isBot ? 'text-slate-400 text-xs' : ''
          }`}
        >
          {renderMessageContent(msg.message)}
        </div>
      </div>
      {isConsecutive && (
        <span className="text-[10px] text-slate-700 group-hover:text-slate-600 transition-colors self-center">
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
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-slate-700" />
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{formatted}</span>
      <div className="flex-1 h-px bg-slate-700" />
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
    return <div className="text-slate-500 text-sm">Configure an IRC channel to track</div>;
  }

  if (isLoading) {
    return <div className="text-slate-500 text-sm">Loading messages...</div>;
  }

  if (error) {
    return <div className="text-red-400 text-sm">Error: {(error as Error).message}</div>;
  }

  const messages = data?.messages || [];

  if (messages.length === 0) {
    return <div className="text-slate-500 text-sm">No recent messages in #{channel}</div>;
  }

  // Group messages by date and check for consecutive messages from same user
  let currentDate = '';
  let lastNick = '';

  return (
    <div className="space-y-0 px-1">
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
