import { useState, useRef, useEffect } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useCreateDashboard, useUpdateDashboard, useDeleteDashboard } from '../../hooks/useDashboards';

export function DashboardTabs() {
  const {
    dashboards,
    currentDashboardId,
    setCurrentDashboard,
    renamingDashboardId,
    startRenamingDashboard,
    stopRenamingDashboard,
  } = useDashboardStore();

  const createDashboard = useCreateDashboard();
  const updateDashboard = useUpdateDashboard();
  const deleteDashboard = useDeleteDashboard();

  const [renameValue, setRenameValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingDashboardId && inputRef.current) {
      const dashboard = dashboards.find(d => d.id === renamingDashboardId);
      if (dashboard) {
        setRenameValue(dashboard.name);
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }, [renamingDashboardId, dashboards]);

  const handleRename = (id: number) => {
    if (renameValue.trim()) {
      updateDashboard.mutate({ id, dto: { name: renameValue.trim() } });
    }
    stopRenamingDashboard();
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === 'Enter') {
      handleRename(id);
    } else if (e.key === 'Escape') {
      stopRenamingDashboard();
    }
  };

  const handleAddDashboard = () => {
    createDashboard.mutate({ name: `Dashboard ${dashboards.length + 1}` });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (dashboards.length <= 1) {
      alert('Cannot delete the last dashboard');
      return;
    }
    if (confirm('Delete this dashboard and all its widgets?')) {
      deleteDashboard.mutate(id);
    }
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {dashboards.map((dashboard) => {
        const isActive = dashboard.id === currentDashboardId;
        const isRenaming = dashboard.id === renamingDashboardId;

        return (
          <div
            key={dashboard.id}
            onClick={() => !isRenaming && setCurrentDashboard(dashboard.id)}
            onDoubleClick={() => startRenamingDashboard(dashboard.id)}
            className={`
              group relative flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer
              transition-colors select-none min-w-0
              ${isActive
                ? 'bg-slate-800 text-slate-100'
                : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
              }
            `}
          >
            {isRenaming ? (
              <input
                ref={inputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRename(dashboard.id)}
                onKeyDown={(e) => handleKeyDown(e, dashboard.id)}
                className="bg-slate-700 text-slate-100 text-sm px-1 py-0.5 rounded w-24 outline-none border border-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="text-sm truncate max-w-32">{dashboard.name}</span>
                {dashboard.attentionCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 font-medium">
                    {dashboard.attentionCount}
                  </span>
                )}
                {dashboard.attentionCount === 0 && dashboard.widgetCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-slate-700 text-slate-400">
                    {dashboard.widgetCount}
                  </span>
                )}
              </>
            )}

            {/* Close button - only show on hover for non-active or when active and more than 1 dashboard */}
            {!isRenaming && dashboards.length > 1 && (
              <button
                onClick={(e) => handleDelete(dashboard.id, e)}
                className={`
                  p-0.5 rounded transition-opacity
                  ${isActive ? 'opacity-50 hover:opacity-100' : 'opacity-0 group-hover:opacity-50 hover:!opacity-100'}
                  hover:text-red-400
                `}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        );
      })}

      {/* Add dashboard button */}
      <button
        onClick={handleAddDashboard}
        disabled={createDashboard.isPending}
        className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        title="Add dashboard"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
