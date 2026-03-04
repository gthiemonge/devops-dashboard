import { useState } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { Modal } from './Modal';
import { DataSourcesSettings } from './DataSourcesSettings';
import { CredentialsSettings } from './CredentialsSettings';

type Tab = 'general' | 'datasources' | 'credentials';

const inputClass = "w-full px-3 py-2 bg-[#0a0e14] border border-[#30363d] rounded text-xs text-[#e6edf3] font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20";
const labelClass = "block text-xs font-medium text-[#7d8590] mb-1.5 uppercase tracking-wider";

function GeneralSettings() {
  const { newItemsHours, setNewItemsHours } = useDashboardStore();

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>New Items Time Window (hours)</label>
        <input
          type="number"
          value={newItemsHours}
          onChange={(e) => setNewItemsHours(parseInt(e.target.value) || 4)}
          className={inputClass}
          min={1}
          max={72}
        />
        <p className="text-[10px] text-[#484f58] mt-1">
          Items created within this time window are marked as "new"
        </p>
      </div>
    </div>
  );
}

export function SettingsModal() {
  const { closeSettings } = useDashboardStore();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  return (
    <Modal title="Settings" onClose={closeSettings} width="lg">
      <div className="flex border-b border-slate-700 mb-4">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'general'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('datasources')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'datasources'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Data Sources
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'credentials'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Credentials
        </button>
      </div>

      {activeTab === 'general' && <GeneralSettings />}
      {activeTab === 'datasources' && <DataSourcesSettings />}
      {activeTab === 'credentials' && <CredentialsSettings />}
    </Modal>
  );
}
