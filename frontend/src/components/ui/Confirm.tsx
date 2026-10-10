/**
 * In-app confirmation (replaces window.confirm) and inline Alert (replaces alert()).
 *
 *   <ConfirmButton variant="ghost" size="sm" icon="trash" aria-label="Delete widget"
 *     confirmLabel="Delete?" onConfirm={() => deleteWidget.mutate(id)} />
 *
 * First click arms the button: it turns into a danger "Delete?" button for `timeout` ms
 * (default 3000). A second click confirms; Escape, blur or the timeout disarm it.
 *
 *   const { armed, trigger, disarm } = useConfirm(onConfirm);   // for custom UIs
 *
 *   {error && <Alert tone="danger" onDismiss={() => setError(null)}>Import failed: {error}</Alert>}
 */
import { useCallback, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Button, type ButtonProps } from './Button';
import { Icon, type IconName } from './Icon';

export interface UseConfirm {
  /** True while waiting for the confirming click. */
  armed: boolean;
  /** Call on click: arms on the first call, runs onConfirm on the second. */
  trigger: () => void;
  /** Cancel the pending confirmation. */
  disarm: () => void;
}

export function useConfirm(onConfirm: () => void, timeout = 3000): UseConfirm {
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const onConfirmRef = useRef(onConfirm);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  });

  const setBoth = useCallback((value: boolean) => {
    armedRef.current = value;
    setArmed(value);
  }, []);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setBoth(false), timeout);
    return () => clearTimeout(t);
  }, [armed, timeout, setBoth]);

  const trigger = useCallback(() => {
    if (armedRef.current) {
      setBoth(false);
      onConfirmRef.current();
    } else {
      setBoth(true);
    }
  }, [setBoth]);

  const disarm = useCallback(() => setBoth(false), [setBoth]);
  return { armed, trigger, disarm };
}

export type ConfirmButtonProps = ButtonProps & {
  onConfirm: () => void;
  /** Label shown while armed. Default "Confirm?". */
  confirmLabel?: ReactNode;
  /** Ms before the armed state resets. Default 3000. */
  timeout?: number;
};

export function ConfirmButton({
  onConfirm,
  confirmLabel = 'Confirm?',
  timeout = 3000,
  onClick,
  onBlur,
  onKeyDown,
  ...buttonProps
}: ConfirmButtonProps) {
  const { armed, trigger, disarm } = useConfirm(onConfirm, timeout);

  const handlers = {
    onClick: (e: MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      trigger();
    },
    onBlur: (e: FocusEvent<HTMLButtonElement>) => {
      onBlur?.(e);
      disarm();
    },
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(e);
      if (e.key === 'Escape' && armed) {
        e.stopPropagation();
        disarm();
      }
    },
  };

  if (armed) {
    const { icon: _icon, children: _children, variant: _variant, ...rest } = buttonProps;
    void _icon; void _children; void _variant;
    return (
      <Button
        {...rest}
        {...handlers}
        variant="danger"
        aria-label={typeof confirmLabel === 'string' ? confirmLabel : undefined}
        aria-live="polite"
      >
        {confirmLabel}
      </Button>
    );
  }
  return <Button {...(buttonProps as ButtonProps)} {...handlers} />;
}

export type AlertTone = 'danger' | 'warn' | 'info' | 'ok';

const ALERT_TONE: Record<AlertTone, { box: string; icon: IconName }> = {
  danger: { box: 'bg-danger/10 border-danger/30 text-danger', icon: 'alert' },
  warn: { box: 'bg-warn/10 border-warn/30 text-warn', icon: 'alert' },
  info: { box: 'bg-info/10 border-info/30 text-info', icon: 'alert' },
  ok: { box: 'bg-ok/10 border-ok/30 text-ok', icon: 'check-circle' },
};

export interface AlertProps {
  tone?: AlertTone;
  /** Optional bold first line. */
  title?: ReactNode;
  children?: ReactNode;
  /** Shows a close button when provided. */
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ tone = 'danger', title, children, onDismiss, className }: AlertProps) {
  const t = ALERT_TONE[tone];
  return (
    <div
      role={tone === 'danger' || tone === 'warn' ? 'alert' : 'status'}
      className={cx('flex items-start gap-2 rounded-md border px-3 py-2 text-[13px]', t.box, className)}
    >
      <Icon name={t.icon} size={16} className="mt-0.5" />
      <div className="min-w-0 flex-1 text-fg">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className="break-words text-fg-2">{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="-mr-1 rounded p-0.5 text-fg-3 hover:bg-surface-3 hover:text-fg"
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
