import { create } from 'zustand';
import type { Widget, LayoutItem, DataSource, DashboardWithCounts } from '@dashboard/shared';

interface DashboardState {
  // Multi-dashboard support
  dashboards: DashboardWithCounts[];
  currentDashboardId: number | null;

  // Current dashboard's data
  widgets: Widget[];
  layout: LayoutItem[];
  dataSources: DataSource[];

  // Issue tracking per widget
  widgetIssueCounts: Record<number, number>;

  // UI state
  isSettingsOpen: boolean;
  isWidgetPickerOpen: boolean;
  editingWidgetId: number | null;
  renamingDashboardId: number | null;

  // Dashboard actions
  setDashboards: (dashboards: DashboardWithCounts[]) => void;
  setCurrentDashboard: (id: number) => void;
  addDashboard: (dashboard: DashboardWithCounts) => void;
  updateDashboard: (id: number, updates: Partial<DashboardWithCounts>) => void;
  removeDashboard: (id: number) => void;
  startRenamingDashboard: (id: number) => void;
  stopRenamingDashboard: () => void;

  // Widget actions
  setWidgets: (widgets: Widget[]) => void;
  addWidget: (widget: Widget) => void;
  updateWidget: (id: number, widget: Partial<Widget>) => void;
  removeWidget: (id: number) => void;

  // Layout actions
  setLayout: (layout: LayoutItem[]) => void;
  updateLayoutItem: (id: string, item: Partial<LayoutItem>) => void;

  // Data source actions
  setDataSources: (dataSources: DataSource[]) => void;

  // Issue tracking actions
  setWidgetIssueCount: (widgetId: number, count: number) => void;
  getIssueCountForDashboard: (dashboardId: number) => number;

  // UI actions
  openSettings: () => void;
  closeSettings: () => void;
  openWidgetPicker: () => void;
  closeWidgetPicker: () => void;
  editWidget: (id: number) => void;
  closeWidgetEditor: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboards: [],
  currentDashboardId: null,
  widgets: [],
  layout: [],
  dataSources: [],
  widgetIssueCounts: {},
  isSettingsOpen: false,
  isWidgetPickerOpen: false,
  editingWidgetId: null,
  renamingDashboardId: null,

  // Dashboard actions
  setDashboards: (dashboards) => {
    const state = get();
    set({ dashboards });
    // Set current dashboard if not set or invalid
    if (!state.currentDashboardId || !dashboards.find(d => d.id === state.currentDashboardId)) {
      if (dashboards.length > 0) {
        set({ currentDashboardId: dashboards[0].id, layout: dashboards[0].layout });
      }
    } else {
      // Update layout from current dashboard
      const current = dashboards.find(d => d.id === state.currentDashboardId);
      if (current) {
        set({ layout: current.layout });
      }
    }
  },

  setCurrentDashboard: (id) => {
    const dashboard = get().dashboards.find(d => d.id === id);
    set({
      currentDashboardId: id,
      layout: dashboard?.layout || [],
    });
  },

  addDashboard: (dashboard) =>
    set((state) => ({ dashboards: [...state.dashboards, dashboard] })),

  updateDashboard: (id, updates) =>
    set((state) => ({
      dashboards: state.dashboards.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),

  removeDashboard: (id) =>
    set((state) => {
      const newDashboards = state.dashboards.filter((d) => d.id !== id);
      // If deleting current dashboard, switch to first available
      if (state.currentDashboardId === id && newDashboards.length > 0) {
        return {
          dashboards: newDashboards,
          currentDashboardId: newDashboards[0].id,
          layout: newDashboards[0].layout,
        };
      }
      return { dashboards: newDashboards };
    }),

  startRenamingDashboard: (id) => set({ renamingDashboardId: id }),
  stopRenamingDashboard: () => set({ renamingDashboardId: null }),

  // Widget actions
  setWidgets: (widgets) => set({ widgets }),

  addWidget: (widget) =>
    set((state) => ({ widgets: [...state.widgets, widget] })),

  updateWidget: (id, updates) =>
    set((state) => ({
      widgets: state.widgets.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    })),

  removeWidget: (id) =>
    set((state) => ({
      widgets: state.widgets.filter((w) => w.id !== id),
      layout: state.layout.filter((l) => l.i !== id.toString()),
    })),

  // Layout actions
  setLayout: (layout) => set({ layout }),

  updateLayoutItem: (id, updates) =>
    set((state) => ({
      layout: state.layout.map((l) =>
        l.i === id ? { ...l, ...updates } : l
      ),
    })),

  // Data source actions
  setDataSources: (dataSources) => set({ dataSources }),

  // Issue tracking actions
  setWidgetIssueCount: (widgetId, count) =>
    set((state) => ({
      widgetIssueCounts: { ...state.widgetIssueCounts, [widgetId]: count },
    })),

  getIssueCountForDashboard: (dashboardId) => {
    const state = get();
    // Get all widgets for this dashboard and sum their issue counts
    // Note: widgets in state are only for current dashboard, so we need to check dashboardId
    const widgetIds = state.widgets
      .filter((w) => w.dashboardId === dashboardId)
      .map((w) => w.id);
    return widgetIds.reduce((sum, id) => sum + (state.widgetIssueCounts[id] || 0), 0);
  },

  // UI actions
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openWidgetPicker: () => set({ isWidgetPickerOpen: true }),
  closeWidgetPicker: () => set({ isWidgetPickerOpen: false }),
  editWidget: (id) => set({ editingWidgetId: id }),
  closeWidgetEditor: () => set({ editingWidgetId: null }),
}));
