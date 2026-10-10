import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardStore } from '../store/dashboardStore';
import { shouldIgnoreShortcut } from '../lib/shortcuts';
import { proxyApi } from '../services/api';

/** Installs the global keyboard shortcuts listed in lib/shortcuts.ts. */
export function useKeyboardShortcuts({ onShowHelp }: { onShowHelp: () => void }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreShortcut(e)) return;
      // Read the store at key time so the listener never goes stale
      const state = useDashboardStore.getState();
      const { dashboards, currentDashboardId } = state;
      const currentIndex = dashboards.findIndex((d) => d.id === currentDashboardId);
      const locked = currentDashboardId == null || !state.unlockedDashboardIds[currentDashboardId];

      let handled = true;
      if (/^[1-9]$/.test(e.key)) {
        const dashboard = dashboards[Number(e.key) - 1];
        if (dashboard) state.setCurrentDashboard(dashboard.id);
      } else if ((e.key === '[' || e.key === ']') && dashboards.length > 0) {
        const step = e.key === '[' ? -1 : 1;
        const next = (Math.max(currentIndex, 0) + step + dashboards.length) % dashboards.length;
        state.setCurrentDashboard(dashboards[next].id);
      } else if (e.key === 'r') {
        // Bypass the backend cache too, otherwise the refetch may return the same data
        void proxyApi
          .refreshCache()
          .catch(() => undefined)
          .then(() => queryClient.refetchQueries({ type: 'active' }));
      } else if (e.key === 'l') {
        if (currentDashboardId != null) state.toggleDashboardLock(currentDashboardId);
      } else if (e.key === 'a') {
        if (!locked) state.openWidgetPicker();
      } else if (e.key === '?') {
        onShowHelp();
      } else {
        handled = false;
      }
      if (handled) e.preventDefault();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [queryClient, onShowHelp]);
}
