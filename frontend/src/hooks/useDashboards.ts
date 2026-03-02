import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardsApi } from '../services/api';
import { useDashboardStore } from '../store/dashboardStore';
import type { CreateDashboardDto, UpdateDashboardDto } from '@dashboard/shared';

export function useDashboards() {
  const { setDashboards } = useDashboardStore();

  return useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const dashboards = await dashboardsApi.getAll();
      setDashboards(dashboards);
      return dashboards;
    },
  });
}

export function useCreateDashboard() {
  const queryClient = useQueryClient();
  const { addDashboard, setCurrentDashboard } = useDashboardStore();

  return useMutation({
    mutationFn: (dto: CreateDashboardDto) => dashboardsApi.create(dto),
    onSuccess: (newDashboard) => {
      addDashboard({ ...newDashboard, widgetCount: 0, attentionCount: 0 });
      setCurrentDashboard(newDashboard.id);
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });
}

export function useUpdateDashboard() {
  const queryClient = useQueryClient();
  const { updateDashboard } = useDashboardStore();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateDashboardDto }) =>
      dashboardsApi.update(id, dto),
    onSuccess: (updated) => {
      updateDashboard(updated.id, updated);
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient();
  const { removeDashboard } = useDashboardStore();

  return useMutation({
    mutationFn: (id: number) => dashboardsApi.delete(id),
    onSuccess: (_, id) => {
      removeDashboard(id);
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
    },
  });
}
