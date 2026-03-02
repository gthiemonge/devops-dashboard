import { useState } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useCreateWidget } from '../../hooks/useWidgets';
import { Modal } from './Modal';
import type { WidgetType, CreateWidgetDto } from '@dashboard/shared';

interface WidgetTypeOption {
  type: WidgetType;
  name: string;
  description: string;
  sourceType: 'gerrit' | 'zuul' | 'irc';
  icon: string;
  color: string;
  defaultConfig: Record<string, unknown>;
}

const widgetTypes: WidgetTypeOption[] = [
  {
    type: 'gerrit_recent_changes',
    name: 'Recent Changes',
    description: 'Open changes for a project',
    sourceType: 'gerrit',
    icon: 'gerrit',
    color: 'emerald',
    defaultConfig: { project: 'openstack/octavia', limit: 10, message: '' },
  },
  {
    type: 'gerrit_my_changes',
    name: 'My Changes',
    description: 'Your changes needing attention',
    sourceType: 'gerrit',
    icon: 'gerrit',
    color: 'emerald',
    defaultConfig: { limit: 10 },
  },
  {
    type: 'gerrit_user_changes',
    name: "User's Changes",
    description: "Track another user's changes",
    sourceType: 'gerrit',
    icon: 'gerrit',
    color: 'emerald',
    defaultConfig: { owner: '', limit: 10, message: '' },
  },
  {
    type: 'zuul_periodic_jobs',
    name: 'Failed Jobs',
    description: 'Failed Zuul periodic jobs',
    sourceType: 'zuul',
    icon: 'zuul',
    color: 'amber',
    defaultConfig: { project: 'openstack/octavia', pipeline: 'periodic', limit: 10, days: 7 },
  },
  {
    type: 'irc_recent_messages',
    name: 'IRC Messages',
    description: 'Recent channel messages',
    sourceType: 'irc',
    icon: 'irc',
    color: 'purple',
    defaultConfig: { channel: 'openstack-lbaas', limit: 20 },
  },
];

function generateTitle(type: WidgetType, config: Record<string, unknown>): string {
  const project = config.project as string;
  const owner = config.owner as string;
  const channel = config.channel as string;
  const shortProject = project?.replace('openstack/', '') || '';

  switch (type) {
    case 'gerrit_recent_changes':
      return shortProject ? `Changes: ${shortProject}` : 'Recent Changes';
    case 'gerrit_my_changes':
      return 'My Changes';
    case 'gerrit_user_changes':
      return owner ? `Changes: ${owner}` : "User's Changes";
    case 'zuul_periodic_jobs':
      return shortProject ? `Zuul: ${shortProject}` : 'Zuul Periodic';
    case 'irc_recent_messages':
      return channel ? `IRC: #${channel}` : 'IRC Messages';
    default:
      return 'Widget';
  }
}

const inputClass = "w-full px-3 py-2 bg-[#0a0e14] border border-[#30363d] rounded text-xs text-[#e6edf3] font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20";
const labelClass = "block text-xs font-medium text-[#7d8590] mb-1.5 uppercase tracking-wider";

export function WidgetPicker() {
  const { closeWidgetPicker, dataSources } = useDashboardStore();
  const createWidget = useCreateWidget();
  const [selectedType, setSelectedType] = useState<WidgetTypeOption | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});

  const handleSelectType = (type: WidgetTypeOption) => {
    setSelectedType(type);
    setConfig(type.defaultConfig);
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
      title: generateTitle(selectedType.type, config),
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
        <div className="grid grid-cols-2 gap-2">
          {widgetTypes.map((wt) => (
            <button
              key={wt.type}
              onClick={() => handleSelectType(wt)}
              className={`
                text-left p-3 rounded border border-[#21262d]
                hover:border-${wt.color}-500/50 hover:bg-[#161b22]
                transition-all group
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full bg-${wt.color}-500`}></span>
                <p className="text-xs font-medium text-[#e6edf3] group-hover:text-cyan-400 transition-colors">
                  {wt.name}
                </p>
              </div>
              <p className="text-[10px] text-[#7d8590] leading-tight">{wt.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedType(null)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-mono"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back
          </button>

          {selectedType.type === 'gerrit_recent_changes' && (
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

          {selectedType.type === 'gerrit_user_changes' && (
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
            </>
          )}

          {selectedType.type === 'zuul_periodic_jobs' && (
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

          {selectedType.type === 'irc_recent_messages' && (
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

          <div className="flex justify-end gap-2 pt-2 border-t border-[#21262d]">
            <button
              onClick={closeWidgetPicker}
              className="px-3 py-1.5 text-xs text-[#7d8590] hover:text-[#e6edf3] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={createWidget.isPending}
              className="px-3 py-1.5 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-500 disabled:opacity-50 transition-colors font-medium"
            >
              {createWidget.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
