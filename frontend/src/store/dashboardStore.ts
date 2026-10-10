import { create } from 'zustand';
import type { Widget, LayoutItem, DataSource, DashboardWithCounts } from '@dashboard/shared';

/**
 * Per-widget signals, reported by each widget with `reportWidgetSignals`.
 * - total: number of items shown (after filtering noise)
 * - truncated: more items exist than were fetched (header shows `total+`)
 * - action: items needing the user's action (definition per widget type, see UI-SPEC)
 * - newCount: items new within the `newItemsHours` window
 * - available: optional number of matching items at the source when it is known
 *   (header shows "20 of 120" instead of `20+`)
 */
export interface WidgetSignals {
  total: number;
  truncated: boolean;
  action: number;
  newCount: number;
  available?: number;
}

/** Per-dashboard totals (sum of its widgets' signals). */
export interface DashboardSignals {
  action: number;
  newCount: number;
}

const EMPTY_WIDGET_SIGNALS: WidgetSignals = Object.freeze({ total: 0, truncated: false, action: 0, newCount: 0 });
const EMPTY_DASHBOARD_SIGNALS: DashboardSignals = Object.freeze({ action: 0, newCount: 0 });

interface DashboardState {
  // Multi-dashboard support
  dashboards: DashboardWithCounts[];
  currentDashboardId: number | null;

  // Current dashboard's data
  widgets: Widget[];
  layout: LayoutItem[];
  dataSources: DataSource[];

  // Signals per widget (keyed by widget id). Entries for widgets of other dashboards
  // are kept across tab switches; entries for deleted widgets are dropped.
  widgetSignals: Record<number, WidgetSignals>;
  // Signals per dashboard (keyed by dashboard id), recomputed from the widgets of each
  // dashboard currently loaded in `widgets`; kept for other dashboards across tab switches.
  dashboardSignals: Record<number, DashboardSignals>;
  newItemsHours: number;

  // Lock state (per-dashboard, locked by default)
  unlockedDashboardIds: Record<number, boolean>;

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

  // Signals actions
  /**
   * Report a widget's signals. Omitted fields keep their previous value (default 0/false).
   * No-op when nothing changed, so it is safe to call from an effect on every render.
   */
  reportWidgetSignals: (widgetId: number, signals: Partial<WidgetSignals>) => void;
  setNewItemsHours: (hours: number) => void;

  // Lock actions
  toggleDashboardLock: (id: number) => void;
  isDashboardLocked: () => boolean;

  // UI actions
  openSettings: () => void;
  closeSettings: () => void;
  openWidgetPicker: () => void;
  closeWidgetPicker: () => void;
  editWidget: (id: number) => void;
  closeWidgetEditor: () => void;
}

// Remember the selected dashboard tab so a page reload stays on it
const CURRENT_DASHBOARD_KEY = 'currentDashboardId';

function loadCurrentDashboardId(): number | null {
  try {
    const value = parseInt(localStorage.getItem(CURRENT_DASHBOARD_KEY) ?? '', 10);
    return Number.isNaN(value) ? null : value;
  } catch {
    return null;
  }
}

function saveCurrentDashboardId(id: number): void {
  try {
    localStorage.setItem(CURRENT_DASHBOARD_KEY, id.toString());
  } catch {
    // Storage unavailable (e.g. private mode), the tab is just not remembered
  }
}

type SignalsSlice = Pick<DashboardState, 'widgetSignals' | 'dashboardSignals'>;

/**
 * Build the signals part of the state: recompute dashboardSignals for every dashboard
 * that has widgets in `widgets` plus `extraDashboardIds` (e.g. a dashboard whose last
 * widget was just removed), and keep the others.
 */
function buildSignals(
  widgetSignals: Record<number, WidgetSignals>,
  previous: Record<number, DashboardSignals>,
  widgets: Widget[],
  extraDashboardIds: number[] = [],
): SignalsSlice {
  const totals: Record<number, DashboardSignals> = {};
  for (const id of extraDashboardIds) totals[id] = { action: 0, newCount: 0 };
  for (const w of widgets) {
    const t = (totals[w.dashboardId] ??= { action: 0, newCount: 0 });
    const sig = widgetSignals[w.id];
    if (sig) {
      t.action += sig.action;
      t.newCount += sig.newCount;
    }
  }

  const dashboardSignals = { ...previous };
  for (const [key, t] of Object.entries(totals)) {
    const id = Number(key);
    const prev = previous[id];
    // Keep the previous object when unchanged so selectors stay referentially stable
    dashboardSignals[id] = prev && prev.action === t.action && prev.newCount === t.newCount ? prev : t;
  }

  return { widgetSignals, dashboardSignals };
}

function omitKeys<T>(record: Record<number, T>, ids: number[]): Record<number, T> {
  if (!ids.some((id) => id in record)) return record;
  const copy = { ...record };
  for (const id of ids) delete copy[id];
  return copy;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboards: [],
  currentDashboardId: null,
  widgets: [],
  layout: [],
  dataSources: [],
  widgetSignals: {},
  dashboardSignals: {},
  newItemsHours: 4,
  unlockedDashboardIds: {},
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
        const savedId = loadCurrentDashboardId();
        const initial = dashboards.find(d => d.id === savedId) ?? dashboards[0];
        set({ currentDashboardId: initial.id, layout: initial.layout });
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
    saveCurrentDashboardId(id);
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
      // Drop the signals of the deleted dashboard and of its loaded widgets
      const removedWidgetIds = state.widgets.filter((w) => w.dashboardId === id).map((w) => w.id);
      const signals = buildSignals(
        omitKeys(state.widgetSignals, removedWidgetIds),
        omitKeys(state.dashboardSignals, [id]),
        state.widgets.filter((w) => w.dashboardId !== id),
      );
      // If deleting current dashboard, switch to first available
      if (state.currentDashboardId === id && newDashboards.length > 0) {
        saveCurrentDashboardId(newDashboards[0].id);
        return {
          ...signals,
          dashboards: newDashboards,
          currentDashboardId: newDashboards[0].id,
          layout: newDashboards[0].layout,
        };
      }
      return { ...signals, dashboards: newDashboards };
    }),

  startRenamingDashboard: (id) => set({ renamingDashboardId: id }),
  stopRenamingDashboard: () => set({ renamingDashboardId: null }),

  // Widget actions
  setWidgets: (widgets) =>
    set((state) => {
      // Widgets that disappeared from a dashboard covered by the new list (or from the
      // current dashboard, which may now be empty) were deleted: drop their signals.
      const covered = new Set(widgets.map((w) => w.dashboardId));
      if (state.currentDashboardId != null) covered.add(state.currentDashboardId);
      const kept = new Set(widgets.map((w) => w.id));
      const removed = state.widgets
        .filter((w) => covered.has(w.dashboardId) && !kept.has(w.id))
        .map((w) => w.id);
      return {
        widgets,
        ...buildSignals(
          omitKeys(state.widgetSignals, removed),
          state.dashboardSignals,
          widgets,
          [...covered],
        ),
      };
    }),

  addWidget: (widget) =>
    set((state) => {
      const widgets = [...state.widgets, widget];
      return { widgets, ...buildSignals(state.widgetSignals, state.dashboardSignals, widgets) };
    }),

  updateWidget: (id, updates) =>
    set((state) => ({
      widgets: state.widgets.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    })),

  removeWidget: (id) =>
    set((state) => {
      const removed = state.widgets.find((w) => w.id === id);
      const widgets = state.widgets.filter((w) => w.id !== id);
      return {
        widgets,
        layout: state.layout.filter((l) => l.i !== id.toString()),
        ...buildSignals(
          omitKeys(state.widgetSignals, [id]),
          state.dashboardSignals,
          widgets,
          removed ? [removed.dashboardId] : [],
        ),
      };
    }),

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

  // Signals actions
  reportWidgetSignals: (widgetId, signals) => {
    const state = get();
    const prev = state.widgetSignals[widgetId] ?? EMPTY_WIDGET_SIGNALS;
    const next: WidgetSignals = {
      total: signals.total ?? prev.total,
      truncated: signals.truncated ?? prev.truncated,
      action: signals.action ?? prev.action,
      newCount: signals.newCount ?? prev.newCount,
      available: 'available' in signals ? signals.available : prev.available,
    };
    if (
      state.widgetSignals[widgetId] &&
      prev.total === next.total &&
      prev.truncated === next.truncated &&
      prev.action === next.action &&
      prev.newCount === next.newCount &&
      prev.available === next.available
    ) {
      return; // unchanged: no state update, no re-render
    }
    set(buildSignals({ ...state.widgetSignals, [widgetId]: next }, state.dashboardSignals, state.widgets));
  },

  setNewItemsHours: (hours) => set({ newItemsHours: hours }),

  // Lock actions
  toggleDashboardLock: (id) =>
    set((state) => ({
      unlockedDashboardIds: {
        ...state.unlockedDashboardIds,
        [id]: !state.unlockedDashboardIds[id],
      },
    })),

  isDashboardLocked: () => {
    const state = get();
    if (!state.currentDashboardId) return true;
    return !state.unlockedDashboardIds[state.currentDashboardId];
  },

  // UI actions
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openWidgetPicker: () => set({ isWidgetPickerOpen: true }),
  closeWidgetPicker: () => set({ isWidgetPickerOpen: false }),
  editWidget: (id) => set({ editingWidgetId: id }),
  closeWidgetEditor: () => set({ editingWidgetId: null }),
}));

// ---------------------------------------------------------------------------
// Signals selectors / hooks (referentially stable: safe with zustand v5)
// ---------------------------------------------------------------------------

/** Selector: signals of one widget (zeros if it has not reported yet). */
export const selectWidgetSignals =
  (widgetId: number) =>
  (state: DashboardState): WidgetSignals =>
    state.widgetSignals[widgetId] ?? EMPTY_WIDGET_SIGNALS;

/** Selector: totals of one dashboard (zeros if unknown). */
export const selectDashboardSignals =
  (dashboardId: number | null | undefined) =>
  (state: DashboardState): DashboardSignals =>
    (dashboardId != null && state.dashboardSignals[dashboardId]) || EMPTY_DASHBOARD_SIGNALS;

/** Selector: totals of the current dashboard. */
export const selectCurrentDashboardSignals = (state: DashboardState): DashboardSignals =>
  (state.currentDashboardId != null && state.dashboardSignals[state.currentDashboardId]) ||
  EMPTY_DASHBOARD_SIGNALS;

/** const { total, truncated, action, newCount } = useWidgetSignals(widget.id); */
export function useWidgetSignals(widgetId: number): WidgetSignals {
  return useDashboardStore(selectWidgetSignals(widgetId));
}

/** const { action, newCount } = useDashboardSignals(dashboard.id); */
export function useDashboardSignals(dashboardId: number | null | undefined): DashboardSignals {
  return useDashboardStore(selectDashboardSignals(dashboardId));
}

/** const { action, newCount } = useCurrentDashboardSignals(); */
export function useCurrentDashboardSignals(): DashboardSignals {
  return useDashboardStore(selectCurrentDashboardSignals);
}
