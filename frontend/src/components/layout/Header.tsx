import { useDashboardStore } from '../../store/dashboardStore';
import { DashboardTabs } from '../dashboard/DashboardTabs';

export function Header() {
  const { openSettings, openWidgetPicker, widgetIssueCounts, widgetNewItemCounts, newItemsHours } = useDashboardStore();

  // Calculate totals from all tracked widgets
  const totalIssues = Object.values(widgetIssueCounts).reduce((sum, count) => sum + count, 0);
  const totalNewItems = Object.values(widgetNewItemCounts).reduce((sum, count) => sum + count, 0);

  return (
    <header className="bg-[#0d1117] border-b border-[#21262d]">
      {/* Top bar */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[#e6edf3] tracking-tight">
                DevOps Dashboard
              </h1>
              <p className="text-[10px] text-[#7d8590] font-mono uppercase tracking-wider">
                OpenStack CI/CD
              </p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="hidden sm:flex items-center gap-2 ml-4">
            {/* Issues indicator */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
              totalIssues > 0
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-[#161b22] border-[#21262d]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                totalIssues > 0 ? 'bg-red-500 pulse-dot' : 'bg-emerald-500'
              }`}></span>
              <span className={`text-xs font-mono ${
                totalIssues > 0 ? 'text-red-400' : 'text-[#7d8590]'
              }`}>
                {totalIssues > 0 ? `${totalIssues} issue${totalIssues !== 1 ? 's' : ''}` : 'all clear'}
              </span>
            </div>

            {/* New items indicator */}
            {totalNewItems > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border bg-cyan-500/10 border-cyan-500/30">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                <span className="text-xs font-mono text-cyan-400">
                  {totalNewItems} new ({newItemsHours}h)
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openWidgetPicker}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Widget
          </button>
          <button
            onClick={openSettings}
            className="p-1.5 text-[#7d8590] hover:text-[#e6edf3] hover:bg-[#21262d] rounded transition-colors"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="px-4 border-t border-[#21262d]">
        <DashboardTabs />
      </div>
    </header>
  );
}
