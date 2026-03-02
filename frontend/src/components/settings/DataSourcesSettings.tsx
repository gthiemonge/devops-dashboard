import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataSourcesApi } from '../../services/api';
import type { DataSource, CreateDataSourceDto, DataSourceType } from '@dashboard/shared';

export function DataSourcesSettings() {
  const queryClient = useQueryClient();
  const { data: dataSources, isLoading } = useQuery({
    queryKey: ['dataSources'],
    queryFn: dataSourcesApi.getAll,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newSource, setNewSource] = useState<CreateDataSourceDto>({
    name: '',
    type: 'gerrit',
    baseUrl: '',
  });

  const createMutation = useMutation({
    mutationFn: dataSourcesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
      setIsAdding(false);
      setNewSource({ name: '', type: 'gerrit', baseUrl: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dataSourcesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newSource);
  };

  if (isLoading) {
    return <div className="text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {dataSources?.map((source: DataSource) => (
          <div
            key={source.id}
            className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
          >
            <div>
              <p className="font-medium text-slate-200">{source.name}</p>
              <p className="text-sm text-slate-400">
                {source.type} · {source.baseUrl}
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Delete this data source?')) {
                  deleteMutation.mutate(source.id);
                }
              }}
              className="p-2 text-slate-500 hover:text-red-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {isAdding ? (
        <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-slate-700/50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
            <input
              type="text"
              value={newSource.name}
              onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              placeholder="My Gerrit Instance"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
            <select
              value={newSource.type}
              onChange={(e) => setNewSource({ ...newSource, type: e.target.value as DataSourceType })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="gerrit">Gerrit</option>
              <option value="zuul">Zuul</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Base URL</label>
            <input
              type="url"
              value={newSource.baseUrl}
              onChange={(e) => setNewSource({ ...newSource, baseUrl: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              placeholder="https://review.example.org"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full px-3 py-2 text-sm text-blue-400 border border-blue-500/50 rounded-md hover:bg-blue-500/10 transition-colors"
        >
          + Add Data Source
        </button>
      )}
    </div>
  );
}
