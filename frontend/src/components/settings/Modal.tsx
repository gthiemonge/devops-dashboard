/**
 * Accessible modal dialog used by every settings / widget dialog.
 *
 *   <Modal title="Configure widget" onClose={close} footer={<><Button>Cancel</Button><Button variant="primary">Save</Button></>}>
 *     ...fields
 *   </Modal>
 *
 * - role="dialog", aria-modal, labelled by the title (and described by `description` when given)
 * - Escape and a click on the backdrop close it
 * - initial focus goes to the first element marked `data-autofocus`, else the first focusable
 *   element of the body, else the dialog itself; Tab / Shift+Tab cycle inside the dialog
 * - focus returns to the previously focused element on close
 * - header and footer stay in place; only the body scrolls
 */
import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui';
import { cx } from '../../lib/cx';

export type ModalSize = 'md' | 'lg';

interface ModalProps {
  title: ReactNode;
  /** Optional one-line description under the title. */
  description?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  size?: ModalSize;
  /** Rendered below the header, outside the scrolling body (e.g. a tablist). */
  toolbar?: ReactNode;
  /** Action bar pinned to the bottom of the dialog. */
  footer?: ReactNode;
  /** Content rendered at the start of the footer, left of the actions (e.g. a hint). */
  footerStart?: ReactNode;
}

const SIZE: Record<ModalSize, string> = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.closest('[inert]') && el.getClientRects().length > 0,
  );
}

export function Modal({ title, description, children, onClose, size = 'md', toolbar, footer, footerStart }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Initial focus, focus restore, scroll lock.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const body = bodyRef.current;
    if (panel) {
      const target =
        panel.querySelector<HTMLElement>('[data-autofocus]') ??
        (body && focusableIn(body)[0]) ??
        panel;
      target.focus({ preventScroll: true });
    }
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (previouslyFocused && previouslyFocused.isConnected && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  // Escape closes. Listening on document so it works wherever focus is; components that
  // consume Escape themselves (e.g. an armed ConfirmButton) stop its propagation first.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Focus trap.
  const handlePanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = focusableIn(panelRef.current);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const handleBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget;
  };
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    // Only close when the whole click happened on the backdrop (not a text selection
    // drag that started inside the dialog).
    if (e.target === e.currentTarget && mouseDownOnBackdrop.current) onClose();
    mouseDownOnBackdrop.current = false;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-canvas/75 px-4 py-[8vh] backdrop-blur-[2px]"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        className={cx(
          'flex max-h-[84vh] w-full flex-col overflow-hidden rounded-xl border border-line bg-surface font-sans',
          'shadow-[0_16px_48px_-12px_rgb(0_0_0/0.6)] outline-none',
          SIZE[size],
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line py-3 pl-5 pr-3">
          <div className="min-w-0 pt-0.5">
            <h2 id={titleId} className="truncate text-[15px] font-semibold leading-6 text-fg">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-xs text-fg-3">
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" icon="close" aria-label="Close dialog" onClick={onClose} />
        </div>

        {toolbar && <div className="shrink-0 border-b border-line px-5">{toolbar}</div>}

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {(footer || footerStart) && (
          <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-5 py-3">
            <div className="min-w-0 flex-1 text-xs text-fg-3">{footerStart}</div>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
