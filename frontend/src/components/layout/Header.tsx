import { useDashboardStore } from '../../store/dashboardStore';
import { DashboardTabs } from '../dashboard/DashboardTabs';

export function Header() {
  const { openSettings, openWidgetPicker } = useDashboardStore();

  return (
    <header className="bg-slate-900 border-b border-slate-700">
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-semibold text-slate-100">
            Dashboard
          </h1>
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
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      <div className="px-4 pb-0">
        <DashboardTabs />
      </div>
    </header>
  );
}
