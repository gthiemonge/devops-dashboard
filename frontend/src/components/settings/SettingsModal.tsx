import { useState } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { Modal } from './Modal';
import { DataSourcesSettings } from './DataSourcesSettings';
import { CredentialsSettings } from './CredentialsSettings';

type Tab = 'datasources' | 'credentials';

export function SettingsModal() {
  const { closeSettings } = useDashboardStore();
  const [activeTab, setActiveTab] = useState<Tab>('datasources');

  return (
    <Modal title="Settings" onClose={closeSettings} width="lg">
      <div className="flex border-b border-slate-200 mb-4">
        <button
          onClick={() => setActiveTab('datasources')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'datasources'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Data Sources
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'credentials'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Credentials
        </button>
      </div>

      {activeTab === 'datasources' && <DataSourcesSettings />}
      {activeTab === 'credentials' && <CredentialsSettings />}
    </Modal>
  );
}
