import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { credentialsApi, dataSourcesApi } from '../../services/api';
import type { Credential, CreateCredentialDto, DataSource } from '@dashboard/shared';

export function CredentialsSettings() {
  const queryClient = useQueryClient();
  const { data: credentials, isLoading: credentialsLoading } = useQuery({
    queryKey: ['credentials'],
    queryFn: credentialsApi.getAll,
  });
  const { data: dataSources, isLoading: dataSourcesLoading } = useQuery({
    queryKey: ['dataSources'],
    queryFn: dataSourcesApi.getAll,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newCred, setNewCred] = useState<CreateCredentialDto>({
    dataSourceId: 0,
    username: '',
    password: '',
  });

  const createMutation = useMutation({
    mutationFn: credentialsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setIsAdding(false);
      setNewCred({ dataSourceId: 0, username: '', password: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: credentialsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newCred);
  };

  if (credentialsLoading || dataSourcesLoading) {
    return <div className="text-slate-500">Loading...</div>;
  }

  const getDataSourceName = (id: number) => {
    return dataSources?.find((ds: DataSource) => ds.id === id)?.name || 'Unknown';
  };

  const availableDataSources = dataSources?.filter(
    (ds: DataSource) => !credentials?.some((c: Credential) => c.dataSourceId === ds.id)
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Add credentials for authenticated access to data sources (required for "My Changes" queries).
      </p>

      <div className="space-y-2">
        {credentials?.map((cred: Credential) => (
          <div
            key={cred.id}
            className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
          >
            <div>
              <p className="font-medium text-slate-200">{getDataSourceName(cred.dataSourceId)}</p>
              <p className="text-sm text-slate-400">User: {cred.username}</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Delete these credentials?')) {
                  deleteMutation.mutate(cred.dataSourceId);
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
            <label className="block text-sm font-medium text-slate-300 mb-1">Data Source</label>
            <select
              value={newCred.dataSourceId}
              onChange={(e) => setNewCred({ ...newCred, dataSourceId: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              required
            >
              <option value={0}>Select a data source</option>
              {availableDataSources?.map((ds: DataSource) => (
                <option key={ds.id} value={ds.id}>{ds.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
            <input
              type="text"
              value={newCred.username}
              onChange={(e) => setNewCred({ ...newCred, username: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password / HTTP Token</label>
            <input
              type="password"
              value={newCred.password}
              onChange={(e) => setNewCred({ ...newCred, password: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
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
              disabled={createMutation.isPending || newCred.dataSourceId === 0}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          disabled={!availableDataSources?.length}
          className="w-full px-3 py-2 text-sm text-blue-400 border border-blue-500/50 rounded-md hover:bg-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Credentials
        </button>
      )}
    </div>
  );
}
