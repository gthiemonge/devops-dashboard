/** Global keyboard shortcuts, shared by the key handler and the help dialog. */
export interface ShortcutHelp {
  keys: string[];
  label: string;
}

export const SHORTCUTS: ShortcutHelp[] = [
  { keys: ['1', '…', '9'], label: 'Go to dashboard 1–9' },
  { keys: ['['], label: 'Previous dashboard' },
  { keys: [']'], label: 'Next dashboard' },
  { keys: ['r'], label: 'Refresh all widgets' },
  { keys: ['l'], label: 'Lock / unlock the dashboard' },
  { keys: ['a'], label: 'Add a widget (when unlocked)' },
  { keys: ['?'], label: 'Show keyboard shortcuts' },
];

/** True when a key press should not trigger a global shortcut. */
export function shouldIgnoreShortcut(e: KeyboardEvent): boolean {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return true;
  const target = e.target as HTMLElement | null;
  if (target) {
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return true;
  }
  // A dialog owns the keyboard while it's open
  return document.querySelector('[aria-modal="true"]') != null;
}
