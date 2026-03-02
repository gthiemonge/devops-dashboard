import { useWidgets, useLayout, useDataSources } from '../../hooks/useWidgets';
import { useDashboardStore } from '../../store/dashboardStore';
import { DashboardGrid } from './DashboardGrid';
import { SettingsModal } from '../settings/SettingsModal';
import { WidgetPicker } from '../settings/WidgetPicker';
import { WidgetConfigModal } from '../settings/WidgetConfigModal';

export function Dashboard() {
  const { isLoading: widgetsLoading } = useWidgets();
  const { isLoading: layoutLoading } = useLayout();
  const { isLoading: dataSourcesLoading } = useDataSources();
  const { isSettingsOpen, isWidgetPickerOpen, editingWidgetId } = useDashboardStore();

  const isLoading = widgetsLoading || layoutLoading || dataSourcesLoading;

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
