import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataSourcesApi } from '../../services/api';
import type { DataSource, CreateDataSourceDto, DataSourceType } from '@dashboard/shared';
import { Alert, Button, ConfirmButton, Field, Input, Select, Spinner } from '../ui';
import { SOURCE_META, SourceIcon } from './sources';

const EMPTY: CreateDataSourceDto = { name: '', type: 'gerrit', baseUrl: '' };

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function DataSourcesSettings() {
  const queryClient = useQueryClient();
  const { data: dataSources, isLoading, error: loadError } = useQuery({
    queryKey: ['dataSources'],
    queryFn: dataSourcesApi.getAll,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newSource, setNewSource] = useState<CreateDataSourceDto>(EMPTY);

  const createMutation = useMutation({
    mutationFn: dataSourcesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
      setIsAdding(false);
      setNewSource(EMPTY);
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
    return (
      <div className="flex items-center gap-2 text-[13px] text-fg-3">
        <Spinner /> Loading data sources…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-fg-2">Servers the widgets read from. New widgets use the first data source of their type.</p>

      {loadError && <Alert tone="danger" title="Could not load data sources">{errorMessage(loadError)}</Alert>}
      {deleteMutation.error && (
        <Alert tone="danger" title="Could not delete the data source" onDismiss={() => deleteMutation.reset()}>
          {errorMessage(deleteMutation.error)}
        </Alert>
      )}

      {dataSources && dataSources.length > 0 ? (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {dataSources.map((source: DataSource) => (
            <li key={source.id} className="flex items-center gap-3 px-3 py-2.5">
              <SourceIcon type={source.type} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-fg">{source.name}</p>
                <p className="flex min-w-0 gap-1.5 text-[11px] text-fg-3">
                  <span className="shrink-0">{SOURCE_META[source.type]?.label ?? source.type}</span>
                  <span aria-hidden>·</span>
                  <span className="truncate font-mono" title={source.baseUrl}>{source.baseUrl}</span>
                </p>
              </div>
              <ConfirmButton
                variant="ghost"
                size="sm"
                icon="trash"
                aria-label={`Delete data source ${source.name}`}
                confirmLabel="Delete?"
                disabled={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutate(source.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        !loadError && (
          <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[13px] text-fg-3">
            No data sources yet.
          </p>
        )
      )}

      {isAdding ? (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-line bg-canvas/40 p-4">
          <h3 className="text-[13px] font-semibold text-fg">New data source</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem]">
            <Field label="Name" required>
              <Input
                type="text"
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                placeholder="OpenDev Gerrit"
                required
                autoFocus
              />
            </Field>
            <Field label="Type">
              <Select
                value={newSource.type}
                onChange={(e) => setNewSource({ ...newSource, type: e.target.value as DataSourceType })}
              >
                <option value="gerrit">Gerrit</option>
                <option value="zuul">Zuul</option>
                <option value="irc">IRC</option>
                <option value="launchpad">Launchpad</option>
              </Select>
            </Field>
          </div>
          <Field label="Base URL" required>
            <Input
              type="url"
              value={newSource.baseUrl}
              onChange={(e) => setNewSource({ ...newSource, baseUrl: e.target.value })}
              placeholder="https://review.opendev.org"
              className="font-mono"
              required
            />
          </Field>
          {createMutation.error && (
            <Alert tone="danger" title="Could not add the data source" onDismiss={() => createMutation.reset()}>
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
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding…' : 'Add data source'}
            </Button>
          </div>
        </form>
      ) : (
        <Button icon="plus" onClick={() => setIsAdding(true)}>
          Add data source
        </Button>
      )}
    </div>
  );
}
