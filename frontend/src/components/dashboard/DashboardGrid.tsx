import { useMemo, useCallback, useEffect, useRef } from 'react';
import GridLayout, { Layout, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboardStore } from '../../store/dashboardStore';
import { useUpdateLayout } from '../../hooks/useWidgets';
import { WidgetContainer } from './WidgetContainer';
import type { LayoutItem, Widget } from '@dashboard/shared';
import { Button, WidgetEmpty } from '../ui';
import { cx } from '../../lib/cx';

// Size the grid from its container instead of window.innerWidth, which
// includes the vertical scrollbar and makes the grid overflow the page.
const AutoWidthGridLayout = WidthProvider(GridLayout);

function sameLayout(a: LayoutItem[], b: LayoutItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item) => {
    const other = b.find((l) => l.i === item.i);
    return !!other && other.x === item.x && other.y === item.y && other.w === item.w && other.h === item.h;
  });
}

function toItems(newLayout: Layout[]): LayoutItem[] {
  return newLayout.map((l) => ({
    i: l.i,
    x: l.x,
    y: l.y,
    w: l.w,
    h: l.h,
    minW: l.minW,
    minH: l.minH,
  }));
}

export function DashboardGrid() {
  const { widgets: allWidgets, layout, currentDashboardId, isDashboardLocked, openWidgetPicker } = useDashboardStore();
  const locked = isDashboardLocked();
  const updateLayout = useUpdateLayout();

  // Right after a tab switch, `layout` already belongs to the new dashboard while
  // `widgets` still holds the previous dashboard's widgets until they are refetched.
  // Only ever render (and save) the widgets of the current dashboard.
  const widgets = useMemo(
    () => allWidgets.filter((w) => w.dashboardId === currentDashboardId),
    [allWidgets, currentDashboardId],
  );
  const switching = widgets.length === 0 && allWidgets.length > 0;

  // True when every widget has a stored position. When some don't, the grid shows
  // fallback positions that the user never chose: don't auto-save those.
  const layoutComplete = useMemo(
    () => widgets.every((w) => layout.some((l) => l.i === w.id.toString())),
    [widgets, layout],
  );

  const gridLayout: Layout[] = useMemo(() => {
    return widgets.map((widget) => {
      const existing = layout.find((l) => l.i === widget.id.toString());
      return existing || {
        i: widget.id.toString(),
        x: 0,
        y: Infinity,
        w: 4,
        h: 3,
        minW: 2,
        minH: 2,
      };
    });
  }, [widgets, layout]);

  // Last layout sent to the server. A resize/drag stop fires both onResizeStop/onDragStop
  // and onLayoutChange synchronously, before the store (and thus `layout`) is updated:
  // comparing with the last sent layout too keeps that to a single PUT.
  const lastSaved = useRef<{ dashboardId: number | null; items: LayoutItem[] } | null>(null);
  // Once the store has caught up (or the layout changed from elsewhere), `layout` is the reference again
  useEffect(() => {
    lastSaved.current = null;
  }, [layout]);

  // Render widgets in visual order (top to bottom, left to right) so the keyboard tab
  // order follows the layout instead of the widgets' creation order.
  const orderedWidgets = useMemo(() => {
    const pos = new Map(gridLayout.map((l) => [l.i, l]));
    const key = (w: Widget) => pos.get(w.id.toString());
    return [...widgets].sort((a, b) => {
      const la = key(a);
      const lb = key(b);
      if (!la || !lb) return 0;
      return la.y - lb.y || la.x - lb.x;
    });
  }, [widgets, gridLayout]);

  const save = useCallback((newLayout: Layout[]) => {
    if (locked) return;
    const ids = new Set(widgets.map((w) => w.id.toString()));
    if (newLayout.length !== ids.size || !newLayout.every((l) => ids.has(l.i))) return;
    const items = toItems(newLayout);
    // The grid reports its layout after every render; only save real changes
    if (sameLayout(items, layout)) return;
    const last = lastSaved.current;
    if (last && last.dashboardId === currentDashboardId && sameLayout(items, last.items)) return;
    lastSaved.current = { dashboardId: currentDashboardId, items };
    updateLayout.mutate(items);
  }, [updateLayout, locked, layout, widgets, currentDashboardId]);

  // Automatic reports (compaction after a widget is removed, ...): only with a complete layout
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    if (!layoutComplete) return;
    save(newLayout);
  }, [save, layoutComplete]);

  // Explicit user moves/resizes are always saved
  const handleUserChange = useCallback((newLayout: Layout[]) => save(newLayout), [save]);

  if (switching) return null;

  if (widgets.length === 0) {
    return (
      <div className="px-3 py-16">
        <WidgetEmpty className="text-[13px]">
          <span className="block text-fg-2">This dashboard has no widgets yet</span>
          {locked ? (
            <span className="mt-1 block">Unlock the dashboard to add widgets.</span>
          ) : (
            <Button variant="primary" size="sm" icon="plus" className="mt-3" onClick={openWidgetPicker}>
              Add widget
            </Button>
          )}
        </WidgetEmpty>
      </div>
    );
  }

  return (
    <AutoWidthGridLayout
      className={cx('layout', !locked && 'is-editing')}
      layout={gridLayout}
      cols={12}
      rowHeight={100}
      margin={[8, 8]}
      containerPadding={[8, 8]}
      onLayoutChange={handleLayoutChange}
      onDragStop={handleUserChange}
      onResizeStop={handleUserChange}
      draggableHandle=".widget-drag-handle"
      isDraggable={!locked}
      isResizable={!locked}
      compactType="vertical"
    >
      {orderedWidgets.map((widget) => (
        <div key={widget.id.toString()}>
          <WidgetContainer widget={widget} />
        </div>
      ))}
    </AutoWidthGridLayout>
  );
}
