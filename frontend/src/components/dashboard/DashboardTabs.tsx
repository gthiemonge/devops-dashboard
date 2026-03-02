import { useState, useRef, useEffect } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useCreateDashboard, useUpdateDashboard, useDeleteDashboard } from '../../hooks/useDashboards';
import { dashboardsApi } from '../../services/api';
import { useQueryClient } from '@tanstack/react-query';
import type { DashboardExport } from '@dashboard/shared';

export function DashboardTabs() {
  const {
    dashboards,
    currentDashboardId,
    setCurrentDashboard,
    renamingDashboardId,
    startRenamingDashboard,
    stopRenamingDashboard,
    widgets,
    widgetIssueCounts,
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

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!currentDashboardId) return;
    try {
      const data = await dashboardsApi.export(currentDashboardId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${data.dashboard.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: DashboardExport = JSON.parse(text);
      const newDashboard = await dashboardsApi.import(data);
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      setCurrentDashboard(newDashboard.id);
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-0.5 py-1 overflow-x-auto">
      {dashboards.map((dashboard) => {
        const isActive = dashboard.id === currentDashboardId;
        const isRenaming = dashboard.id === renamingDashboardId;

        // Calculate issue count for this dashboard
        // For current dashboard, use live widget issue counts
        // For other dashboards, we don't have live data (would need to fetch)
        const issueCount = isActive
          ? widgets
              .filter((w) => w.dashboardId === dashboard.id)
              .reduce((sum, w) => sum + (widgetIssueCounts[w.id] || 0), 0)
          : dashboard.attentionCount || 0;
        const hasIssues = issueCount > 0;

        return (
          <div
            key={dashboard.id}
            onClick={() => !isRenaming && setCurrentDashboard(dashboard.id)}
            onDoubleClick={() => startRenamingDashboard(dashboard.id)}
            className={`
              group relative flex items-center gap-2 px-3 py-1.5 cursor-pointer
              transition-all select-none text-xs font-medium
              border-b-2 -mb-[1px]
              ${isActive
                ? 'text-cyan-400 border-cyan-400 bg-[#161b22]'
                : 'text-[#7d8590] border-transparent hover:text-[#e6edf3] hover:bg-[#161b22]/50'
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
                className="bg-[#0d1117] text-cyan-400 text-xs px-1.5 py-0.5 rounded w-24 outline-none border border-cyan-500 font-mono"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                {/* Status dot for active dashboard */}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                )}

                <span className="truncate max-w-28 font-mono">{dashboard.name}</span>

                {/* Badge - show issue count if any, otherwise widget count */}
                {hasIssues ? (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/20 text-red-400 font-mono font-bold">
                    {issueCount}
                  </span>
                ) : dashboard.widgetCount > 0 ? (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#21262d] text-[#7d8590] font-mono">
                    {dashboard.widgetCount}
                  </span>
                ) : null}
              </>
            )}

            {/* Close button */}
            {!isRenaming && dashboards.length > 1 && (
              <button
                onClick={(e) => handleDelete(dashboard.id, e)}
                className={`
                  p-0.5 rounded transition-all
                  ${isActive ? 'opacity-40 hover:opacity-100' : 'opacity-0 group-hover:opacity-40 hover:!opacity-100'}
                  hover:text-red-400 hover:bg-red-500/10
                `}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        );
      })}

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-[#21262d]">
        {/* Add dashboard */}
        <button
          onClick={handleAddDashboard}
          disabled={createDashboard.isPending}
          className="p-1.5 rounded text-[#484f58] hover:text-cyan-400 hover:bg-[#161b22] transition-colors"
          title="Add dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Export dashboard */}
        <button
          onClick={handleExport}
          disabled={!currentDashboardId}
          className="p-1.5 rounded text-[#484f58] hover:text-cyan-400 hover:bg-[#161b22] transition-colors disabled:opacity-50"
          title="Export current dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Import dashboard */}
        <button
          onClick={handleImport}
          className="p-1.5 rounded text-[#484f58] hover:text-cyan-400 hover:bg-[#161b22] transition-colors"
          title="Import dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
