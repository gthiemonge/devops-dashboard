import { create } from 'zustand';
import type { Widget, Layout, LayoutItem, DataSource } from '@dashboard/shared';

interface DashboardState {
  widgets: Widget[];
  layout: LayoutItem[];
  dataSources: DataSource[];
  isSettingsOpen: boolean;
  isWidgetPickerOpen: boolean;
  editingWidgetId: number | null;

  setWidgets: (widgets: Widget[]) => void;
  addWidget: (widget: Widget) => void;
  updateWidget: (id: number, widget: Partial<Widget>) => void;
  removeWidget: (id: number) => void;

  setLayout: (layout: LayoutItem[]) => void;
  updateLayoutItem: (id: string, item: Partial<LayoutItem>) => void;

  setDataSources: (dataSources: DataSource[]) => void;

  openSettings: () => void;
  closeSettings: () => void;
  openWidgetPicker: () => void;
  closeWidgetPicker: () => void;
  editWidget: (id: number) => void;
  closeWidgetEditor: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  widgets: [],
  layout: [],
  dataSources: [],
  isSettingsOpen: false,
  isWidgetPickerOpen: false,
  editingWidgetId: null,

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

  setLayout: (layout) => set({ layout }),
  updateLayoutItem: (id, updates) =>
    set((state) => ({
      layout: state.layout.map((l) =>
        l.i === id ? { ...l, ...updates } : l
      ),
    })),

  setDataSources: (dataSources) => set({ dataSources }),

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openWidgetPicker: () => set({ isWidgetPickerOpen: true }),
  closeWidgetPicker: () => set({ isWidgetPickerOpen: false }),
  editWidget: (id) => set({ editingWidgetId: id }),
  closeWidgetEditor: () => set({ editingWidgetId: null }),
}));
