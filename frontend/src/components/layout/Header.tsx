import { useDashboardStore } from '../../store/dashboardStore';
import { useSummary } from '../../hooks/useWidgets';

export function Header() {
  const { openSettings, openWidgetPicker } = useDashboardStore();
  const { data: summary } = useSummary();

  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-slate-800">
            Developer Dashboard
          </h1>
          {summary && (
            <div className="flex items-center gap-3 text-sm">
              <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">
                {summary.totalItems} items
              </span>
              {summary.totalUrgent > 0 && (
                <span className="px-2 py-1 bg-red-100 rounded text-red-700">
                  {summary.totalUrgent} need attention
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openWidgetPicker}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Add Widget
          </button>
          <button
            onClick={openSettings}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            Settings
          </button>
        </div>
      </div>
    </header>
  );
}
