import { useDashboardStore } from '../../store/dashboardStore';
import { useSummary } from '../../hooks/useWidgets';

export function Header() {
  const { openSettings, openWidgetPicker } = useDashboardStore();
  const { data: summary } = useSummary();

  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-slate-100">
            Developer Dashboard
          </h1>
          {summary && (
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">
                {summary.totalItems} items
              </span>
              {summary.totalUrgent > 0 && (
                <span className="px-2 py-0.5 bg-red-900/50 rounded text-red-400">
                  {summary.totalUrgent} need attention
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openWidgetPicker}
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Add Widget
          </button>
          <button
            onClick={openSettings}
            className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            Settings
          </button>
        </div>
      </div>
    </header>
  );
}
