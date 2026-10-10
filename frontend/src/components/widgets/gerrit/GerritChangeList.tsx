import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Widget } from '@dashboard/shared';
import { useGerritChanges } from '../../../hooks/useGerritChanges';
import { useGerritSelf } from '../../../hooks/useGerritSelf';
import { useDashboardStore } from '../../../store/dashboardStore';
import { getNewItemsCutoff } from '../../../lib/newItems';
import { WidgetEmpty, WidgetError, WidgetLoading } from '../../ui';
import { GerritChangeRow } from './GerritChangeRow';
import { buildChangeViews } from './changeState';

const OWNER_MIN_WIDTH = 320; // px (the owner truncates first, so it fits 3-column widgets)
const PATCHSET_MIN_WIDTH = 300;

export interface GerritChangeListProps {
  widget: Widget;
  query: string;
  limit: number;
  /** When false (widget not configured), show `unconfigured` instead of fetching. */
  enabled?: boolean;
  unconfigured?: string;
  /** Owner column in the meta line (off for owner-scoped widgets). */
  showOwner?: boolean;
  /** Every row needs the user's action (My changes); otherwise only APPROVE rows. */
  allRowsActionable?: boolean;
  emptyMessage: string;
  emptyTone?: 'ok' | 'neutral';
}

/** Body shared by every Gerrit widget: fetch, sort, rows, empty/loading/error, signals. */
export function GerritChangeList({
  widget,
  query,
  limit,
  enabled = true,
  unconfigured = 'Not configured',
  showOwner = true,
  allRowsActionable = false,
  emptyMessage,
  emptyTone = 'neutral',
}: GerritChangeListProps) {
  const newItemsHours = useDashboardStore((s) => s.newItemsHours);
  const reportWidgetSignals = useDashboardStore((s) => s.reportWidgetSignals);
  const baseUrl = useDashboardStore((s) => s.dataSources.find((d) => d.id === widget.dataSourceId)?.baseUrl);

  const { data: changes, isLoading, error, refetch } = useGerritChanges({
    dataSourceId: widget.dataSourceId,
    query,
    limit,
    refreshInterval: widget.refreshInterval,
    enabled,
  });
  // Narrow widgets drop the owner, then the patch set, from the meta line (never wrap).
  const [width, setWidth] = useState(Infinity);
  const observerRef = useRef<ResizeObserver | null>(null);
  const listRef = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    observerRef.current = ro;
  }, []);

  const { data: self } = useGerritSelf(widget.dataSourceId);
  const selfId = self?._account_id;

  // Recomputed on each data refresh (the cutoff moves with time only then; good enough).
  const views = useMemo(
    () => (changes ? buildChangeViews(changes, selfId, getNewItemsCutoff(newItemsHours)) : []),
    [changes, selfId, newItemsHours],
  );

  useEffect(() => {
    if (!enabled) {
      reportWidgetSignals(widget.id, { total: 0, truncated: false, action: 0, newCount: 0 });
      return;
    }
    if (!changes) return;
    const actionable = (v: (typeof views)[number]) => v.action?.state === 'approve';
    reportWidgetSignals(widget.id, {
      total: views.length,
      truncated: changes.some((c) => c._more_changes),
      action: allRowsActionable ? views.length : views.filter(actionable).length,
      newCount: views.filter((v) => v.isNew).length,
    });
  }, [enabled, changes, views, allRowsActionable, widget.id, reportWidgetSignals]);

  if (!enabled) return <WidgetEmpty icon="settings">{unconfigured}</WidgetEmpty>;
  if (isLoading) return <WidgetLoading />;
  if (error) return <WidgetError message="Couldn't load changes" error={error} onRetry={() => void refetch()} />;
  if (views.length === 0) return <WidgetEmpty tone={emptyTone}>{emptyMessage}</WidgetEmpty>;

  return (
    <div ref={listRef} className="flex flex-col">
      {views.map((view) => (
        <GerritChangeRow
          key={view.change.id}
          view={view}
          selfId={selfId}
          showOwner={showOwner && width >= OWNER_MIN_WIDTH}
          showPatchSet={width >= PATCHSET_MIN_WIDTH}
          baseUrl={baseUrl}
        />
      ))}
    </div>
  );
}
