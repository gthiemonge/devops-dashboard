import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DashboardExport } from '@dashboard/shared';
import { useDashboardStore, useCurrentDashboardSignals } from '../../store/dashboardStore';
import { dashboardsApi } from '../../services/api';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { Alert, Button, Icon } from '../ui';
import { cx } from '../../lib/cx';

/** Current-dashboard signals: "N need action" and "N new (Xh)", each only when > 0. */
function CurrentSignals() {
  const { action, newCount } = useCurrentDashboardSignals();
  const newItemsHours = useDashboardStore((s) => s.newItemsHours);
  if (action === 0 && newCount === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-3 text-xs" aria-live="polite">
      {action > 0 && (
        <span
          className="inline-flex h-6 items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2 text-danger"
          title={`${action} item${action === 1 ? '' : 's'} need your action on this dashboard`}
        >
          <Icon name="alert" size={13} />
          <span className="font-mono font-semibold tabular-nums">{action}</span>
          <span className="hidden lg:inline">need action</span>
        </span>
      )}
      {newCount > 0 && (
        <span
          className="inline-flex h-6 items-center gap-1.5 text-fg-2"
          title={`${newCount} new item${newCount === 1 ? '' : 's'} in the last ${newItemsHours}h`}
        >
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-new" />
          <span className="font-mono font-semibold tabular-nums text-fg">{newCount}</span>
          <span className="hidden lg:inline">
            new <span className="font-mono text-fg-3">({newItemsHours}h)</span>
          </span>
        </span>
      )}
    </div>
  );
}

export function Header() {
  const currentDashboardId = useDashboardStore((s) => s.currentDashboardId);
  const setCurrentDashboard = useDashboardStore((s) => s.setCurrentDashboard);
  const openSettings = useDashboardStore((s) => s.openSettings);
  const openWidgetPicker = useDashboardStore((s) => s.openWidgetPicker);
  const toggleDashboardLock = useDashboardStore((s) => s.toggleDashboardLock);
  const locked = useDashboardStore((s) =>
    s.currentDashboardId == null ? true : !s.unlockedDashboardIds[s.currentDashboardId],
  );

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!currentDashboardId) return;
    try {
      const data = await dashboardsApi.export(currentDashboardId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${data.dashboard.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Export failed: ${(err as Error).message}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data: DashboardExport = JSON.parse(text);
      const newDashboard = await dashboardsApi.import(data);
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      setCurrentDashboard(newDashboard.id);
      setError(null);
    } catch (err) {
      setError(`Import failed: ${(err as Error).message}`);
    }
    // Reset input so the same file can be picked again
    e.target.value = '';
  };

  return (
    <header className="relative h-12 border-b border-line bg-surface">
      <div className="flex h-full items-center gap-3 px-3">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-2 pr-1">
          <svg viewBox="0 0 20 20" className="size-5 text-accent" fill="currentColor" aria-hidden>
            <rect x="2" y="2" width="16" height="5" rx="1.5" />
            <rect x="2" y="9" width="7" height="9" rx="1.5" opacity="0.7" />
            <rect x="11" y="9" width="7" height="9" rx="1.5" opacity="0.45" />
          </svg>
          <span className="hidden text-[13px] font-semibold tracking-tight text-fg xl:inline">DevOps Dashboard</span>
        </div>

        {/* Tabs (scroll horizontally when they don't fit) */}
        <div className="min-w-0 flex-1 self-stretch">
          <DashboardTabs />
        </div>

        <CurrentSignals />

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon="download"
            aria-label="Export dashboard"
            onClick={handleExport}
            disabled={!currentDashboardId}
          />
          <Button
            variant="ghost"
            size="sm"
            icon="upload"
            aria-label="Import dashboard"
            onClick={() => fileInputRef.current?.click()}
          />
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />

          <span className="mx-1 h-5 w-px bg-line" aria-hidden />

          <button
            type="button"
            onClick={() => currentDashboardId && toggleDashboardLock(currentDashboardId)}
            disabled={!currentDashboardId}
            aria-label={locked ? 'Locked: unlock dashboard to edit' : 'Editing: lock dashboard'}
            title={locked ? 'Unlock dashboard to edit' : 'Lock dashboard'}
            className={cx(
              'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors',
              'disabled:pointer-events-none disabled:opacity-50',
              locked
                ? 'border-line bg-transparent text-fg-2 hover:border-line-strong hover:bg-surface-2 hover:text-fg'
                : 'border-accent/40 bg-accent/15 text-accent hover:bg-accent/20',
            )}
          >
            <Icon name={locked ? 'lock' : 'unlock'} size={14} />
            {locked ? 'Locked' : 'Editing'}
          </button>

          {!locked && (
            <Button variant="primary" size="sm" icon="plus" onClick={openWidgetPicker}>
              Add widget
            </Button>
          )}

          <Button variant="ghost" size="sm" icon="settings" aria-label="Settings" onClick={openSettings} />
        </div>
      </div>

      {error && (
        <div className="absolute right-3 top-full z-50 mt-2 w-96 max-w-[calc(100vw-1.5rem)] rounded-md bg-surface shadow-lg shadow-canvas">
          <Alert tone="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}
    </header>
  );
}
