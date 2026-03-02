import { useEffect } from 'react';
import { useDashboards } from '../../hooks/useDashboards';
import { useWidgets, useDataSources } from '../../hooks/useWidgets';
import { useDashboardStore } from '../../store/dashboardStore';
import { DashboardGrid } from './DashboardGrid';
import { SettingsModal } from '../settings/SettingsModal';
import { WidgetPicker } from '../settings/WidgetPicker';
import { WidgetConfigModal } from '../settings/WidgetConfigModal';

export function Dashboard() {
  const { isLoading: dashboardsLoading } = useDashboards();
  const { currentDashboardId, isSettingsOpen, isWidgetPickerOpen, editingWidgetId } = useDashboardStore();
  const { isLoading: widgetsLoading, refetch: refetchWidgets } = useWidgets(currentDashboardId ?? undefined);
  const { isLoading: dataSourcesLoading } = useDataSources();

  // Refetch widgets when dashboard changes
  useEffect(() => {
    if (currentDashboardId) {
      refetchWidgets();
    }
  }, [currentDashboardId, refetchWidgets]);

  const isLoading = dashboardsLoading || widgetsLoading || dataSourcesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <>
      <DashboardGrid />
      {isSettingsOpen && <SettingsModal />}
      {isWidgetPickerOpen && <WidgetPicker />}
      {editingWidgetId !== null && <WidgetConfigModal widgetId={editingWidgetId} />}
    </>
  );
}
