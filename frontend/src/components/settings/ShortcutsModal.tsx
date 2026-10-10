import { Fragment } from 'react';
import { Modal } from './Modal';
import { SHORTCUTS } from '../../lib/shortcuts';

function Key({ children }: { children: string }) {
  if (children === '…') return <span className="px-0.5 text-fg-3">…</span>;
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1.5 font-mono text-[11px] font-semibold text-fg">
      {children}
    </kbd>
  );
}

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2.5 text-[13px]">
        {SHORTCUTS.map((shortcut) => (
          <Fragment key={shortcut.label}>
            <dt className="flex items-center gap-1">
              {shortcut.keys.map((key) => (
                <Key key={key}>{key}</Key>
              ))}
            </dt>
            <dd className="text-fg-2">{shortcut.label}</dd>
          </Fragment>
        ))}
      </dl>
      <p className="mt-4 text-xs text-fg-3">Shortcuts are disabled while typing in a field or when a dialog is open.</p>
    </Modal>
  );
}
