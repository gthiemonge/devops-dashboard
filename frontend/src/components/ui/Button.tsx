/**
 * Button.
 *
 *   <Button variant="primary" icon="plus" onClick={add}>Add widget</Button>
 *   <Button variant="ghost" size="sm" icon="settings" aria-label="Settings" />   // icon-only: aria-label required
 *   <Button variant="danger">Delete</Button>
 *
 * Variants: primary (accent fill), secondary (surface-2 + border, default), ghost (text only),
 * danger (danger fill). Sizes: sm (28px), md (32px). Always type="button" unless overridden.
 */
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { renderIcon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-canvas border-transparent hover:brightness-110 font-semibold',
  secondary: 'bg-surface-2 text-fg border-line hover:bg-surface-3 hover:border-line-strong',
  ghost: 'bg-transparent text-fg-2 border-transparent hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-canvas border-transparent hover:brightness-110 font-semibold',
};

const SIZE: Record<ButtonSize, { text: string; icon: string; px: number }> = {
  sm: { text: 'h-7 px-2 gap-1 text-xs', icon: 'size-7', px: 14 },
  md: { text: 'h-8 px-3 gap-1.5 text-[13px]', icon: 'size-8', px: 16 },
};

interface ButtonBase extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon (name or node). */
  icon?: IconName | ReactNode;
}

interface TextButtonProps extends ButtonBase {
  children: ReactNode;
}

interface IconButtonProps extends ButtonBase {
  children?: undefined;
  icon: IconName | ReactNode;
  /** Required for icon-only buttons. */
  'aria-label': string;
}

export type ButtonProps = TextButtonProps | IconButtonProps;

export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', iconOnly = false): string {
  return cx(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md border font-medium leading-none transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
    iconOnly ? SIZE[size].icon : SIZE[size].text,
    VARIANT[variant],
  );
}

export function Button({ variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest }: ButtonProps) {
  const iconOnly = children === undefined || children === null;
  return (
    <button
      type={type}
      title={iconOnly ? rest['aria-label'] : undefined}
      className={cx(buttonClasses(variant, size, iconOnly), className)}
      {...rest}
    >
      {icon != null && renderIcon(icon, SIZE[size].px)}
      {children}
    </button>
  );
}
