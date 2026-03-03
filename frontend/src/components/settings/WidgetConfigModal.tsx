import { useState, useEffect } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useUpdateWidget } from '../../hooks/useWidgets';
import { Modal } from './Modal';
import type { UpdateWidgetDto } from '@dashboard/shared';

interface WidgetConfigModalProps {
  widgetId: number;
}

const inputClass = "w-full px-3 py-2 bg-[#0a0e14] border border-[#30363d] rounded text-xs text-[#e6edf3] font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20";
const labelClass = "block text-xs font-medium text-[#7d8590] mb-1.5 uppercase tracking-wider";

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
    <Modal title="Configure Widget" onClose={closeWidgetEditor}>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        {widget.type === 'gerrit_recent_changes' && (
          <>
            <div>
              <label className={labelClass}>Project(s)</label>
              <input
                type="text"
                value={(config.project as string) || ''}
                onChange={(e) => setConfig({ ...config, project: e.target.value })}
                className={inputClass}
                placeholder="openstack/octavia, openstack/neutron"
              />
              <p className="text-[10px] text-[#484f58] mt-1">Comma-separated or wildcards (*)</p>
            </div>
            <div>
              <label className={labelClass}>Branch (optional)</label>
              <input
                type="text"
                value={(config.branch as string) || ''}
                onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                className={inputClass}
                placeholder="stable/* for backports"
              />
            </div>
            <div>
              <label className={labelClass}>Message filter (optional)</label>
              <input
                type="text"
                value={(config.message as string) || ''}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                className={inputClass}
                placeholder="DNM, WIP, fix bug"
              />
              <p className="text-[10px] text-[#484f58] mt-1">Full-text search in commit message</p>
            </div>
          </>
        )}

        {widget.type === 'zuul_periodic_jobs' && (
          <>
            <div>
              <label className={labelClass}>Project</label>
              <input
                type="text"
                value={(config.project as string) || ''}
                onChange={(e) => setConfig({ ...config, project: e.target.value })}
                className={inputClass}
                placeholder="openstack/octavia"
              />
            </div>
            <div>
              <label className={labelClass}>Pipeline</label>
              <input
                type="text"
                value={(config.pipeline as string) || ''}
                onChange={(e) => setConfig({ ...config, pipeline: e.target.value })}
                className={inputClass}
                placeholder="periodic"
              />
            </div>
            <div>
              <label className={labelClass}>Days to look back</label>
              <input
                type="number"
                value={(config.days as number) || 7}
                onChange={(e) => setConfig({ ...config, days: parseInt(e.target.value) || 7 })}
                className={inputClass}
                min={1}
                max={90}
              />
              <p className="text-[10px] text-[#484f58] mt-1">Only show failures from the last N days</p>
            </div>
          </>
        )}

        {widget.type === 'gerrit_my_changes' && (
          <div>
            <label className={labelClass}>Additional Query</label>
            <input
              type="text"
              value={(config.query as string) || ''}
              onChange={(e) => setConfig({ ...config, query: e.target.value })}
              className={inputClass}
              placeholder="project:openstack/octavia"
            />
          </div>
        )}

        {widget.type === 'gerrit_user_changes' && (
          <>
            <div>
              <label className={labelClass}>Username</label>
              <input
                type="text"
                value={(config.owner as string) || ''}
                onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                className={inputClass}
                placeholder="username or email"
              />
            </div>
            <div>
              <label className={labelClass}>Message filter (optional)</label>
              <input
                type="text"
                value={(config.message as string) || ''}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                className={inputClass}
                placeholder="DNM, WIP, fix bug"
              />
              <p className="text-[10px] text-[#484f58] mt-1">Full-text search in commit message</p>
            </div>
            <div>
              <label className={labelClass}>Additional Query</label>
              <input
                type="text"
                value={(config.query as string) || ''}
                onChange={(e) => setConfig({ ...config, query: e.target.value })}
                className={inputClass}
                placeholder="project:openstack/octavia"
              />
            </div>
          </>
        )}

        {widget.type === 'irc_recent_messages' && (
          <div>
            <label className={labelClass}>Channel</label>
            <div className="flex items-center gap-1">
              <span className="text-[#484f58] text-xs">#</span>
              <input
                type="text"
                value={(config.channel as string) || ''}
                onChange={(e) => setConfig({ ...config, channel: e.target.value })}
                className={inputClass}
                placeholder="openstack-lbaas"
              />
            </div>
          </div>
        )}

        {widget.type === 'launchpad_bugs' && (
          <>
            <div>
              <label className={labelClass}>Project</label>
              <input
                type="text"
                value={(config.project as string) || ''}
                onChange={(e) => setConfig({ ...config, project: e.target.value })}
                className={inputClass}
                placeholder="octavia"
              />
              <p className="text-[10px] text-[#484f58] mt-1">Launchpad project name (without openstack/ prefix)</p>
            </div>
            <div>
              <label className={labelClass}>Bug Statuses</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['New', 'Incomplete', 'Confirmed', 'Triaged', 'In Progress', 'Fix Committed'].map((status) => (
                  <label key={status} className="flex items-center gap-1.5 text-xs text-[#7d8590]">
                    <input
                      type="checkbox"
                      checked={(config.statuses as string[] || []).includes(status)}
                      onChange={(e) => {
                        const currentStatuses = (config.statuses as string[]) || [];
                        const newStatuses = e.target.checked
                          ? [...currentStatuses, status]
                          : currentStatuses.filter((s) => s !== status);
                        setConfig({ ...config, statuses: newStatuses });
                      }}
                      className="rounded border-[#30363d] bg-[#0a0e14] text-cyan-500 focus:ring-cyan-500/20"
                    />
                    {status}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Sort By</label>
              <select
                value={(config.sortBy as string) || 'id'}
                onChange={(e) => setConfig({ ...config, sortBy: e.target.value })}
                className={inputClass}
              >
                <option value="id">Bug ID (newest first)</option>
                <option value="importance">Importance</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Display Fields</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['title', 'id', 'status', 'reporter', 'assignee', 'tags'].map((field) => (
                  <label key={field} className="flex items-center gap-1.5 text-xs text-[#7d8590]">
                    <input
                      type="checkbox"
                      checked={(config.displayFields as string[] || []).includes(field)}
                      onChange={(e) => {
                        const currentFields = (config.displayFields as string[]) || [];
                        const newFields = e.target.checked
                          ? [...currentFields, field]
                          : currentFields.filter((f) => f !== field);
                        setConfig({ ...config, displayFields: newFields });
                      }}
                      className="rounded border-[#30363d] bg-[#0a0e14] text-cyan-500 focus:ring-cyan-500/20"
                    />
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs text-[#7d8590]">
                <input
                  type="checkbox"
                  checked={(config.fetchTags as boolean) || false}
                  onChange={(e) => setConfig({ ...config, fetchTags: e.target.checked })}
                  className="rounded border-[#30363d] bg-[#0a0e14] text-cyan-500 focus:ring-cyan-500/20"
                />
                <span>Fetch tags (slower - requires extra API calls)</span>
              </label>
            </div>
          </>
        )}

        <div>
          <label className={labelClass}>Max Items</label>
          <input
            type="number"
            value={(config.limit as number) || 10}
            onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) || 10 })}
            className={inputClass}
            min={1}
            max={50}
          />
        </div>

        <div>
          <label className={labelClass}>Refresh Interval (seconds)</label>
          <input
            type="number"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 300)}
            className={inputClass}
            min={60}
            max={3600}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#21262d]">
          <button
            onClick={closeWidgetEditor}
            className="px-3 py-1.5 text-xs text-[#7d8590] hover:text-[#e6edf3] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateWidget.isPending}
            className="px-3 py-1.5 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-500 disabled:opacity-50 transition-colors font-medium"
          >
            {updateWidget.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
