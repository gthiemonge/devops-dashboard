import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { credentialsApi, dataSourcesApi } from '../../services/api';
import type { Credential, CreateCredentialDto, DataSource } from '@dashboard/shared';
import { Alert, Button, ConfirmButton, Field, Input, Select, Spinner } from '../ui';
import { SourceIcon } from './sources';

const EMPTY: CreateCredentialDto = { dataSourceId: 0, username: '', password: '' };

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function CredentialsSettings() {
  const queryClient = useQueryClient();
  const { data: credentials, isLoading: credentialsLoading, error: credentialsError } = useQuery({
    queryKey: ['credentials'],
    queryFn: credentialsApi.getAll,
  });
  const { data: dataSources, isLoading: dataSourcesLoading } = useQuery({
    queryKey: ['dataSources'],
    queryFn: dataSourcesApi.getAll,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newCred, setNewCred] = useState<CreateCredentialDto>(EMPTY);

  const createMutation = useMutation({
    mutationFn: credentialsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setIsAdding(false);
      setNewCred(EMPTY);
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
    return (
      <div className="flex items-center gap-2 text-[13px] text-fg-3">
        <Spinner /> Loading credentials…
      </div>
    );
  }

  const findDataSource = (id: number) => dataSources?.find((ds: DataSource) => ds.id === id);

  const availableDataSources = dataSources?.filter(
    (ds: DataSource) => !credentials?.some((c: Credential) => c.dataSourceId === ds.id),
  );

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-fg-2">
        Credentials for authenticated access to a data source (required by “My changes” widgets).
      </p>

      {credentialsError && (
        <Alert tone="danger" title="Could not load credentials">{errorMessage(credentialsError)}</Alert>
      )}
      {deleteMutation.error && (
        <Alert tone="danger" title="Could not delete the credentials" onDismiss={() => deleteMutation.reset()}>
          {errorMessage(deleteMutation.error)}
        </Alert>
      )}

      {credentials && credentials.length > 0 ? (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {credentials.map((cred: Credential) => {
            const ds = findDataSource(cred.dataSourceId);
            const name = ds?.name ?? 'Unknown data source';
            return (
              <li key={cred.id} className="flex items-center gap-3 px-3 py-2.5">
                {ds ? <SourceIcon type={ds.type} /> : <span className="size-4" aria-hidden />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-fg">{name}</p>
                  <p className="truncate text-[11px] text-fg-3">
                    User <span className="font-mono text-fg-2">{cred.username}</span>
                  </p>
                </div>
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  icon="trash"
                  aria-label={`Delete credentials for ${name}`}
                  confirmLabel="Delete?"
                  disabled={deleteMutation.isPending}
                  onConfirm={() => deleteMutation.mutate(cred.dataSourceId)}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        !credentialsError && (
          <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[13px] text-fg-3">
            No credentials yet.
          </p>
        )
      )}

      {isAdding ? (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-line bg-canvas/40 p-4">
          <h3 className="text-[13px] font-semibold text-fg">New credentials</h3>
          <Field label="Data source" required>
            <Select
              value={newCred.dataSourceId}
              onChange={(e) => setNewCred({ ...newCred, dataSourceId: parseInt(e.target.value) })}
              required
              autoFocus
            >
              <option value={0}>Select a data source</option>
              {availableDataSources?.map((ds: DataSource) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Username" required>
              <Input
                type="text"
                value={newCred.username}
                onChange={(e) => setNewCred({ ...newCred, username: e.target.value })}
                autoComplete="off"
                required
              />
            </Field>
            <Field label="Password or HTTP token" required>
              <Input
                type="password"
                value={newCred.password}
                onChange={(e) => setNewCred({ ...newCred, password: e.target.value })}
                autoComplete="new-password"
                required
              />
            </Field>
          </div>
          {createMutation.error && (
            <Alert tone="danger" title="Could not add the credentials" onDismiss={() => createMutation.reset()}>
              {errorMessage(createMutation.error)}
            </Alert>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                createMutation.reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createMutation.isPending || newCred.dataSourceId === 0}
            >
              {createMutation.isPending ? 'Adding…' : 'Add credentials'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <Button icon="plus" onClick={() => setIsAdding(true)} disabled={!availableDataSources?.length}>
            Add credentials
          </Button>
          {!availableDataSources?.length && (
            <span className="text-xs text-fg-3">Every data source already has credentials.</span>
          )}
        </div>
      )}
    </div>
  );
}
