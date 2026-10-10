/**
 * Uniform widget body states. Each fills its parent (h-full) and centers its content.
 *
 *   if (isLoading) return <WidgetLoading />;
 *   if (error) return <WidgetError error={error} />;            // short text, details in tooltip
 *   if (!items.length) return <WidgetEmpty>No open changes</WidgetEmpty>;
 *   <WidgetEmpty tone="ok">Nothing needs your attention</WidgetEmpty>
 */
import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Icon, renderIcon, type IconName } from './Icon';

const BOX = 'flex h-full min-h-16 w-full flex-col items-center justify-center gap-1.5 p-3 text-center text-xs';

/** Small accent spinner, also usable inline. */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cx('inline-block shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-accent', className)}
    />
  );
}

export interface WidgetLoadingProps {
  /** Optional visible label; screen readers always get "Loading". */
  label?: string;
  className?: string;
}

export function WidgetLoading({ label, className }: WidgetLoadingProps) {
  return (
    <div role="status" aria-label={label ?? 'Loading'} className={cx(BOX, 'text-fg-3', className)}>
      <Spinner />
      {label && <span>{label}</span>}
    </div>
  );
}

export interface WidgetEmptyProps {
  /** 'ok' = positive "all clear" (check icon, ok color); 'neutral' (default) = plain empty. */
  tone?: 'ok' | 'neutral';
  /** Override the icon (name or node). */
  icon?: IconName | ReactNode;
  /** The short message. */
  children?: ReactNode;
  className?: string;
}

export function WidgetEmpty({ tone = 'neutral', icon, children = 'Nothing here', className }: WidgetEmptyProps) {
  const iconNode = icon ?? (tone === 'ok' ? 'check-circle' : 'inbox');
  return (
    <div className={cx(BOX, 'text-fg-3', className)}>
      <span className={tone === 'ok' ? 'text-ok' : 'text-fg-3'}>{renderIcon(iconNode, 18)}</span>
      <span>{children}</span>
    </div>
  );
}

export interface WidgetErrorProps {
  /** Short human message. Default "Couldn't load data". */
  message?: ReactNode;
  /** The raw error; its message goes into the tooltip (title). */
  error?: unknown;
  /** Optional retry handler; renders a small "Retry" link button. */
  onRetry?: () => void;
  className?: string;
}

function errorDetails(error: unknown): string | undefined {
  if (error == null) return undefined;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function WidgetError({ message = "Couldn't load data", error, onRetry, className }: WidgetErrorProps) {
  return (
    <div role="alert" title={errorDetails(error)} className={cx(BOX, 'text-fg-2', className)}>
      <Icon name="alert" size={18} className="text-danger" />
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded px-1 text-[11px] text-fg-3 underline underline-offset-2 hover:text-accent"
        >
          Retry
        </button>
      )}
    </div>
  );
}
