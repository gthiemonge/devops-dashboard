import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import type { Dashboard } from '@dashboard/shared';
import { useDashboardStore, useDashboardSignals } from '../../store/dashboardStore';
import { useCreateDashboard, useUpdateDashboard, useDeleteDashboard } from '../../hooks/useDashboards';
import { Button, Icon, useConfirm } from '../ui';
import { cx } from '../../lib/cx';

interface TabProps {
  dashboard: Dashboard;
  isActive: boolean;
  canClose: boolean;
}

function DashboardTab({ dashboard, isActive, canClose }: TabProps) {
  const setCurrentDashboard = useDashboardStore((s) => s.setCurrentDashboard);
  const renamingDashboardId = useDashboardStore((s) => s.renamingDashboardId);
  const startRenamingDashboard = useDashboardStore((s) => s.startRenamingDashboard);
  const stopRenamingDashboard = useDashboardStore((s) => s.stopRenamingDashboard);
  const unlocked = useDashboardStore((s) => !!s.unlockedDashboardIds[dashboard.id]);
  const { action, newCount } = useDashboardSignals(dashboard.id);

  const updateDashboard = useUpdateDashboard();
  const deleteDashboard = useDeleteDashboard();
  const { armed, trigger, disarm } = useConfirm(() => deleteDashboard.mutate(dashboard.id));

  const isRenaming = dashboard.id === renamingDashboardId;
  const [renameValue, setRenameValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      setRenameValue(dashboard.name);
      inputRef.current.focus();
      inputRef.current.select();
    }
    // Only when entering rename mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRenaming]);

  const commitRename = () => {
    const name = renameValue.trim();
    if (name && name !== dashboard.name) {
      updateDashboard.mutate({ id: dashboard.id, dto: { name } });
    }
    stopRenamingDashboard();
  };

  const onRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitRename();
    else if (e.key === 'Escape') stopRenamingDashboard();
  };

  const counts = (action > 0 || newCount > 0) && (
    <span className="flex items-center gap-1.5">
      {action > 0 && (
        <span
          className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-danger/15 px-1 font-mono text-[10px] font-semibold tabular-nums text-danger"
          title={`${action} need action`}
        >
          {action}
        </span>
      )}
      {newCount > 0 && (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-fg-3" title={`${newCount} new`}>
          <span aria-hidden className="size-1.5 rounded-full bg-new" />
          {newCount}
        </span>
      )}
    </span>
  );

  const label = [
    dashboard.name,
    action > 0 ? `${action} need action` : null,
    newCount > 0 ? `${newCount} new` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      role="presentation"
      className={cx(
        'group/tab relative flex h-full shrink-0 items-center',
        'after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full',
        isActive ? 'after:bg-accent' : 'after:bg-transparent hover:after:bg-line-strong',
      )}
    >
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          aria-label="Dashboard name"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={onRenameKeyDown}
          className="mx-1 h-7 w-44 rounded-md border border-accent bg-surface-2 px-2 text-[13px] text-fg outline-none"
        />
      ) : (
        <button
          type="button"
          role="tab"
          id={`dashboard-tab-${dashboard.id}`}
          aria-selected={isActive}
          aria-label={label}
          tabIndex={isActive ? 0 : -1}
          onClick={() => setCurrentDashboard(dashboard.id)}
          onDoubleClick={() => unlocked && startRenamingDashboard(dashboard.id)}
          onKeyDown={(e) => {
            if (e.key === 'F2' && unlocked) {
              e.preventDefault();
              startRenamingDashboard(dashboard.id);
            }
          }}
          title={unlocked ? `${dashboard.name} (double-click to rename)` : dashboard.name}
          className={cx(
            'flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium transition-colors',
            isActive ? 'text-fg' : 'text-fg-3 hover:bg-surface-2 hover:text-fg',
          )}
        >
          <span className="max-w-[200px] truncate">{dashboard.name}</span>
          {counts}
        </button>
      )}

      {!isRenaming && unlocked && canClose && (
        <button
          type="button"
          onClick={trigger}
          onBlur={disarm}
          onKeyDown={(e) => {
            if (e.key === 'Escape') disarm();
          }}
          aria-label={armed ? `Confirm delete dashboard ${dashboard.name}` : `Delete dashboard ${dashboard.name}`}
          title={armed ? 'Click again to delete this dashboard and its widgets' : 'Delete dashboard'}
          className={cx(
            'mr-1 inline-flex h-5 items-center justify-center rounded text-[11px] font-semibold transition-colors',
            armed
              ? 'bg-danger px-1.5 text-canvas'
              : 'w-5 text-fg-3 hover:bg-danger/15 hover:text-danger',
          )}
        >
          {armed ? 'Delete?' : <Icon name="close" size={12} strokeWidth={2} />}
        </button>
      )}
    </div>
  );
}

export function DashboardTabs() {
  const dashboards = useDashboardStore((s) => s.dashboards);
  const currentDashboardId = useDashboardStore((s) => s.currentDashboardId);
  const setCurrentDashboard = useDashboardStore((s) => s.setCurrentDashboard);
  const createDashboard = useCreateDashboard();

  const handleAddDashboard = () => {
    createDashboard.mutate({ name: `Dashboard ${dashboards.length + 1}` });
  };

  // Arrow-key navigation between tabs (roving tabindex)
  const onTablistKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    if ((e.target as HTMLElement).getAttribute('role') !== 'tab') return;
    const idx = dashboards.findIndex((d) => d.id === currentDashboardId);
    if (idx < 0 || dashboards.length === 0) return;
    e.preventDefault();
    let next = idx;
    if (e.key === 'ArrowLeft') next = (idx - 1 + dashboards.length) % dashboards.length;
    if (e.key === 'ArrowRight') next = (idx + 1) % dashboards.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = dashboards.length - 1;
    const id = dashboards[next].id;
    setCurrentDashboard(id);
    requestAnimationFrame(() => document.getElementById(`dashboard-tab-${id}`)?.focus());
  };

  return (
    <div className="flex h-full min-w-0 items-center gap-1">
      <div
        role="tablist"
        aria-label="Dashboards"
        onKeyDown={onTablistKeyDown}
        className="flex h-full min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]"
      >
        {dashboards.map((dashboard) => (
          <DashboardTab
            key={dashboard.id}
            dashboard={dashboard}
            isActive={dashboard.id === currentDashboardId}
            canClose={dashboards.length > 1}
          />
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        icon="plus"
        aria-label="New dashboard"
        onClick={handleAddDashboard}
        disabled={createDashboard.isPending}
      />
    </div>
  );
}
