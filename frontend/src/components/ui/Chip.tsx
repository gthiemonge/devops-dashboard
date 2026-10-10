/**
 * Small mono status chip.
 *
 *   <Chip variant="danger">CONFLICT</Chip>
 *   <Chip variant="ok" emphasis title="Your vote: +2">+2×2</Chip>
 *   <Chip variant="neutral" size="sm" icon="comment">3</Chip>
 *
 * Height 18px (md) / 16px (sm). Colors come from semantic tokens only.
 */
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { renderIcon, type IconName } from './Icon';

export type ChipVariant = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'accent';

const VARIANT: Record<ChipVariant, string> = {
  neutral: 'bg-surface-3 text-fg-2',
  ok: 'bg-ok/15 text-ok',
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
  accent: 'bg-accent/15 text-accent',
};

// Kept separate from VARIANT so `emphasis` can replace it (both classes
// would otherwise apply and the generated CSS order decides which wins)
const BORDER: Record<ChipVariant, string> = {
  neutral: 'border-line-strong',
  ok: 'border-ok/30',
  warn: 'border-warn/30',
  danger: 'border-danger/30',
  info: 'border-info/30',
  accent: 'border-accent/30',
};

const SIZE = {
  sm: 'h-4 px-1 gap-0.5 text-[10px]',
  md: 'h-[18px] px-1.5 gap-1 text-[11px]',
} as const;

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  size?: keyof typeof SIZE;
  /** Icon name or node shown before the label. */
  icon?: IconName | ReactNode;
  /** Stronger outline (border in the text color), e.g. "this is your vote". */
  emphasis?: boolean;
}

export function Chip({
  variant = 'neutral',
  size = 'md',
  icon,
  emphasis = false,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded border font-mono font-semibold leading-none tabular-nums',
        SIZE[size],
        VARIANT[variant],
        emphasis ? 'border-current' : BORDER[variant],
        className,
      )}
      {...rest}
    >
      {icon != null && renderIcon(icon, size === 'sm' ? 10 : 12)}
      {children}
    </span>
  );
}
