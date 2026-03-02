import { useState, useEffect } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useUpdateWidget } from '../../hooks/useWidgets';
import { Modal } from './Modal';
import type { UpdateWidgetDto } from '@dashboard/shared';

interface WidgetConfigModalProps {
  widgetId: number;
}

export function WidgetConfigModal({ widgetId }: WidgetConfigModalProps) {
  const { closeWidgetEditor, widgets } = useDashboardStore();
  const updateWidget = useUpdateWidget();

  const widget = widgets.find((w) => w.id === widgetId);
  const [title, setTitle] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [refreshInterval, setRefreshInterval] = useState(300);

  useEffect(() => {
    if (widget) {
      setTitle(widget.title);
      setConfig(widget.config);
      setRefreshInterval(widget.refreshInterval);
    }
  }, [widget]);

  if (!widget) {
    return null;
  }

  const handleSave = () => {
    const dto: UpdateWidgetDto = {
      title,
      config,
      refreshInterval,
    };

    updateWidget.mutate(
      { id: widgetId, dto },
      { onSuccess: () => closeWidgetEditor() }
    );
  };

  return (
    <Modal title={`Configure: ${widget.title}`} onClose={closeWidgetEditor}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {(widget.type === 'gerrit_recent_changes' || widget.type === 'zuul_periodic_jobs') && (
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

        {widget.type === 'zuul_periodic_jobs' && (
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
        )}

        {widget.type === 'gerrit_my_changes' && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Additional Query</label>
            <input
              type="text"
              value={(config.query as string) || ''}
              onChange={(e) => setConfig({ ...config, query: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              placeholder="project:openstack/octavia"
            />
          </div>
        )}

        {widget.type === 'gerrit_user_changes' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
              <input
                type="text"
                value={(config.owner as string) || ''}
                onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                placeholder="username or email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Additional Query</label>
              <input
                type="text"
                value={(config.query as string) || ''}
                onChange={(e) => setConfig({ ...config, query: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                placeholder="project:openstack/octavia"
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

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Refresh Interval (seconds)
          </label>
          <input
            type="number"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 300)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
            min={60}
            max={3600}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={closeWidgetEditor}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateWidget.isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {updateWidget.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
