import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { widgetsApi, dataSourcesApi, dashboardsApi } from '../services/api';
import { useDashboardStore } from '../store/dashboardStore';
import type { CreateWidgetDto, UpdateWidgetDto, LayoutItem } from '@dashboard/shared';
import { useEffect } from 'react';

export function useWidgets(dashboardId?: number) {
  const { setWidgets, currentDashboardId } = useDashboardStore();
  const effectiveDashboardId = dashboardId ?? currentDashboardId;

  const query = useQuery({
    queryKey: ['widgets', effectiveDashboardId],
    queryFn: () => widgetsApi.getAll(effectiveDashboardId ?? undefined),
    enabled: effectiveDashboardId !== null,
  });

  useEffect(() => {
    if (query.data) {
      setWidgets(query.data);
    }
  }, [query.data, setWidgets]);

  return query;
}

export function useDataSources() {
  const { setDataSources } = useDashboardStore();

  const query = useQuery({
    queryKey: ['dataSources'],
    queryFn: dataSourcesApi.getAll,
  });

  useEffect(() => {
    if (query.data) {
      setDataSources(query.data);
    }
  }, [query.data, setDataSources]);

  return query;
}

export function useCreateWidget() {
  const queryClient = useQueryClient();
  const { addWidget, layout, setLayout, currentDashboardId, updateDashboard } = useDashboardStore();

  return useMutation({
    mutationFn: (dto: CreateWidgetDto) => widgetsApi.create({
      ...dto,
      dashboardId: dto.dashboardId ?? currentDashboardId ?? 1,
    }),
    onSuccess: (widget) => {
      addWidget(widget);
      // Place the widget below the existing ones. Don't use y: Infinity, it is
      // saved as null and then read back as 0, which makes the grid move the
      // widget back and forth between the top and the bottom.
      const bottom = layout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
      const newLayoutItem: LayoutItem = {
        i: widget.id.toString(),
        x: (layout.length * 4) % 12,
        y: bottom,
        w: 4,
        h: 3,
        minW: 2,
        minH: 2,
      };
      const newLayout = [...layout, newLayoutItem];
      setLayout(newLayout);

      // Update dashboard layout
      if (currentDashboardId) {
        dashboardsApi.update(currentDashboardId, { layout: newLayout });
        updateDashboard(currentDashboardId, { layout: newLayout });
      }

      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });
}

export function useUpdateWidget() {
  const queryClient = useQueryClient();
  const { updateWidget } = useDashboardStore();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateWidgetDto }) =>
      widgetsApi.update(id, dto),
    onSuccess: (widget) => {
      updateWidget(widget.id, widget);
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
    },
  });
}

export function useDeleteWidget() {
  const queryClient = useQueryClient();
  const { removeWidget, layout, setLayout, currentDashboardId, updateDashboard } = useDashboardStore();

  return useMutation({
    mutationFn: (id: number) => widgetsApi.delete(id),
    onSuccess: (_, id) => {
      removeWidget(id);
      const newLayout = layout.filter((l) => l.i !== id.toString());
      setLayout(newLayout);

      // Update dashboard layout
      if (currentDashboardId) {
        dashboardsApi.update(currentDashboardId, { layout: newLayout });
        updateDashboard(currentDashboardId, { layout: newLayout });
      }

      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });
}

export function useUpdateLayout() {
  const { setLayout, currentDashboardId, updateDashboard } = useDashboardStore();

  return useMutation({
    mutationFn: (items: LayoutItem[]) => {
      if (currentDashboardId) {
        return dashboardsApi.update(currentDashboardId, { layout: items });
      }
      return Promise.resolve(null);
    },
    // Update the store right away rather than when the request completes:
    // responses can arrive out of order and would revert to an older layout.
    onMutate: (items) => {
      setLayout(items);
      if (currentDashboardId) {
        updateDashboard(currentDashboardId, { layout: items });
      }
    },
  });
}
