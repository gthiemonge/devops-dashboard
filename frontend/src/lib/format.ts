/**
 * Shared date/time formatting for all widgets.
 *
 *   formatRelative(change.updated)  // 'now' | '5m' | '3h' | '2d' | 'Oct 1'
 *   formatDuration(build.duration)  // '45s' | '12m' | '1h05m'
 */

/** Compact age of a date: <1m 'now', <60m 'Nm', <24h 'Nh', <7d 'Nd', else 'Mon D'. */
export function formatRelative(date: string | number | Date, now: number = Date.now()): string {
  const d = date instanceof Date ? date : new Date(date);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return '';
  const diffMins = Math.floor((now - ms) / 60_000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  // Past ~11 months "Nov 5" would read as an upcoming date, add the year
  if (diffDays > 330) return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Full local date/time, for `title` tooltips next to formatRelative output. */
export function formatAbsolute(date: string | number | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

/** Duration in seconds: <60s 'Ns', <1h 'Nm', else 'NhMMm'. Null/invalid → ''. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '';
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h${minutes.toString().padStart(2, '0')}m`;
  return `${minutes}m`;
}
