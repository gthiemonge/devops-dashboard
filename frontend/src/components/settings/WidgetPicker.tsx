import { useState } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useCreateWidget } from '../../hooks/useWidgets';
import { Modal } from './Modal';
import type { WidgetType, CreateWidgetDto } from '@dashboard/shared';

interface WidgetTypeOption {
  type: WidgetType;
  name: string;
  description: string;
  sourceType: 'gerrit' | 'zuul';
  defaultConfig: Record<string, unknown>;
}

const widgetTypes: WidgetTypeOption[] = [
  {
    type: 'gerrit_recent_changes',
    name: 'Recent Gerrit Changes',
    description: 'Shows recent open changes for a project',
    sourceType: 'gerrit',
    defaultConfig: { project: 'openstack/octavia', limit: 10 },
  },
  {
    type: 'gerrit_my_changes',
    name: 'My Gerrit Changes',
    description: 'Shows your changes that need attention',
    sourceType: 'gerrit',
    defaultConfig: { limit: 10 },
  },
  {
    type: 'zuul_periodic_jobs',
    name: 'Failed Periodic Jobs',
    description: 'Shows failed Zuul periodic jobs',
    sourceType: 'zuul',
    defaultConfig: { project: 'openstack/octavia', pipeline: 'periodic', limit: 10 },
  },
];

export function WidgetPicker() {
  const { closeWidgetPicker, dataSources } = useDashboardStore();
  const createWidget = useCreateWidget();
  const [selectedType, setSelectedType] = useState<WidgetTypeOption | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [title, setTitle] = useState('');

  const handleSelectType = (type: WidgetTypeOption) => {
    setSelectedType(type);
    setConfig(type.defaultConfig);
    setTitle(type.name);
  };

  const handleCreate = () => {
    if (!selectedType) return;

    const dataSource = dataSources.find((ds) => ds.type === selectedType.sourceType);
    if (!dataSource) {
      alert(`No ${selectedType.sourceType} data source configured. Please add one in Settings.`);
      return;
    }

    const dto: CreateWidgetDto = {
      type: selectedType.type,
      title,
      dataSourceId: dataSource.id,
      config,
      refreshInterval: 300,
    };

    createWidget.mutate(dto, {
      onSuccess: () => closeWidgetPicker(),
    });
  };

  return (
    <Modal title="Add Widget" onClose={closeWidgetPicker}>
      {!selectedType ? (
        <div className="space-y-2">
          {widgetTypes.map((wt) => (
            <button
              key={wt.type}
              onClick={() => handleSelectType(wt)}
              className="w-full text-left p-3 rounded-lg border border-slate-600 hover:border-blue-500 hover:bg-slate-700/50 transition-colors"
            >
              <p className="font-medium text-slate-200">{wt.name}</p>
              <p className="text-sm text-slate-400">{wt.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedType(null)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            &larr; Back to widget types
          </button>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {selectedType.type === 'gerrit_recent_changes' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Project</label>
              <input
                type="text"
                value={(config.project as string) || ''}
                onChange={(e) => setConfig({ ...config, project: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                placeholder="openstack/octavia"
              />
            </div>
          )}

          {selectedType.type === 'zuul_periodic_jobs' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Project</label>
                <input
                  type="text"
                  value={(config.project as string) || ''}
                  onChange={(e) => setConfig({ ...config, project: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="openstack/octavia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Pipeline</label>
                <input
                  type="text"
                  value={(config.pipeline as string) || ''}
                  onChange={(e) => setConfig({ ...config, pipeline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="periodic"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Max Items</label>
            <input
              type="number"
              value={(config.limit as number) || 10}
              onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              min={1}
              max={50}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={closeWidgetPicker}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={createWidget.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createWidget.isPending ? 'Creating...' : 'Create Widget'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
