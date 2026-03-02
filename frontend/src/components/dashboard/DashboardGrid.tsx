import { useMemo, useCallback } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboardStore } from '../../store/dashboardStore';
import { useUpdateLayout } from '../../hooks/useWidgets';
import { WidgetContainer } from './WidgetContainer';
import type { LayoutItem } from '@dashboard/shared';

export function DashboardGrid() {
  const { widgets, layout } = useDashboardStore();
  const updateLayout = useUpdateLayout();

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

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    const items: LayoutItem[] = newLayout.map((l) => ({
      i: l.i,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h,
      minW: l.minW,
      minH: l.minH,
    }));
    updateLayout.mutate(items);
  }, [updateLayout]);

  if (widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <p className="text-lg mb-2">No widgets yet</p>
        <p className="text-sm">Click "Add Widget" to get started</p>
      </div>
    );
  }

  return (
    <GridLayout
      className="layout"
      layout={gridLayout}
      cols={12}
      rowHeight={100}
      width={window.innerWidth}
      margin={[0, 0]}
      containerPadding={[0, 0]}
      onLayoutChange={handleLayoutChange}
      draggableHandle=".widget-drag-handle"
      isResizable={true}
      compactType="vertical"
    >
      {widgets.map((widget) => (
        <div key={widget.id.toString()}>
          <WidgetContainer widget={widget} />
        </div>
      ))}
    </GridLayout>
  );
}
