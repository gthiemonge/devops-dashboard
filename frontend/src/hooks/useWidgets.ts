import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { widgetsApi, dataSourcesApi, summaryApi, dashboardsApi } from '../services/api';
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

export function useSummary() {
  return useQuery({
    queryKey: ['summary'],
    queryFn: summaryApi.get,
    refetchInterval: 60000,
  });
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
      const newLayoutItem: LayoutItem = {
        i: widget.id.toString(),
        x: (layout.length * 4) % 12,
        y: Infinity,
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
      queryClient.invalidateQueries({ queryKey: ['summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['summary'] });
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
    onSuccess: (_, items) => {
      setLayout(items);
      if (currentDashboardId) {
        updateDashboard(currentDashboardId, { layout: items });
      }
    },
  });
}
