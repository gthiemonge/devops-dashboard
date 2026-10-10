import { beforeEach, describe, expect, it } from 'vitest';
import type { Widget } from '@dashboard/shared';
import { useDashboardStore } from './dashboardStore';

function widget(id: number, dashboardId: number): Widget {
  return {
    id,
    dashboardId,
    type: 'gerrit_custom_query',
    title: `w${id}`,
    dataSourceId: 1,
    config: {},
    refreshInterval: 300,
    createdAt: '',
    updatedAt: '',
  } as Widget;
}

const store = () => useDashboardStore.getState();

describe('widget signals', () => {
  beforeEach(() => {
    useDashboardStore.setState({
      currentDashboardId: 1,
      widgets: [],
      widgetSignals: {},
      dashboardSignals: {},
    });
  });

  it('sums the widgets of a dashboard', () => {
    store().setWidgets([widget(1, 1), widget(2, 1)]);
    store().reportWidgetSignals(1, { total: 10, action: 2, newCount: 1 });
    store().reportWidgetSignals(2, { total: 5, action: 1, newCount: 3 });
    expect(store().dashboardSignals[1]).toEqual({ action: 3, newCount: 4 });
  });

  it('does not update the state when the signals did not change', () => {
    store().setWidgets([widget(1, 1)]);
    store().reportWidgetSignals(1, { total: 10, action: 2 });
    const before = store().widgetSignals;
    store().reportWidgetSignals(1, { total: 10, action: 2 });
    expect(store().widgetSignals).toBe(before);
  });

  it('keeps omitted fields', () => {
    store().setWidgets([widget(1, 1)]);
    store().reportWidgetSignals(1, { total: 10, available: 120 });
    store().reportWidgetSignals(1, { action: 4 });
    expect(store().widgetSignals[1]).toMatchObject({ total: 10, available: 120, action: 4 });
  });

  it('drops the signals of a removed widget, down to zero', () => {
    store().setWidgets([widget(1, 1)]);
    store().reportWidgetSignals(1, { action: 2, newCount: 1 });
    store().removeWidget(1);
    expect(store().widgetSignals[1]).toBeUndefined();
    expect(store().dashboardSignals[1]).toEqual({ action: 0, newCount: 0 });
  });

  it('keeps the totals of other dashboards across tab switches', () => {
    store().setWidgets([widget(1, 1)]);
    store().reportWidgetSignals(1, { action: 2 });
    useDashboardStore.setState({ currentDashboardId: 2 });
    store().setWidgets([widget(5, 2)]);
    store().reportWidgetSignals(5, { action: 7 });
    expect(store().dashboardSignals[1]).toEqual({ action: 2, newCount: 0 });
    expect(store().dashboardSignals[2]).toEqual({ action: 7, newCount: 0 });
  });
});
