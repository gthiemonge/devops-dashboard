import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { Modal } from './Modal';
import { DataSourcesSettings } from './DataSourcesSettings';
import { CredentialsSettings } from './CredentialsSettings';
import { Field, Input } from '../ui';
import { cx } from '../../lib/cx';

type Tab = 'general' | 'datasources' | 'credentials';

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'datasources', label: 'Data sources' },
  { id: 'credentials', label: 'Credentials' },
];

function GeneralSettings() {
  const { newItemsHours, setNewItemsHours } = useDashboardStore();

  return (
    <div className="space-y-4">
      <Field
        label="New items window"
        hint="Items created within this many hours are marked as new."
      >
        <div className="flex items-center gap-2">
          <div className="w-24">
            <Input
              type="number"
              value={newItemsHours}
              onChange={(e) => setNewItemsHours(parseInt(e.target.value) || 4)}
              className="font-mono"
              min={1}
              max={72}
            />
          </div>
          <span className="text-[13px] text-fg-3">hours</span>
        </div>
      </Field>
    </div>
  );
}

export function SettingsModal() {
  const { closeSettings } = useDashboardStore();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const baseId = useId();
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ general: null, datasources: null, credentials: null });

  const tabId = (t: Tab) => `${baseId}-tab-${t}`;
  const panelId = (t: Tab) => `${baseId}-panel-${t}`;

  const handleTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((t) => t.id === activeTab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const id = TABS[next].id;
    setActiveTab(id);
    tabRefs.current[id]?.focus();
  };

  const tablist = (
    <div role="tablist" aria-label="Settings sections" className="-mx-2 -mb-px flex gap-1" onKeyDown={handleTabKeyDown}>
      {TABS.map((t) => {
        const selected = t.id === activeTab;
        return (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={tabId(t.id)}
            aria-selected={selected}
            aria-controls={panelId(t.id)}
            tabIndex={selected ? 0 : -1}
            data-autofocus={selected ? '' : undefined}
            onClick={() => setActiveTab(t.id)}
            className={cx(
              'h-9 border-b-2 px-2 text-[13px] font-medium transition-colors outline-none',
              'focus-visible:rounded-t-md focus-visible:bg-surface-2 focus-visible:text-fg focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent',
              selected ? 'border-accent text-fg' : 'border-transparent text-fg-3 hover:text-fg-2',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <Modal title="Settings" onClose={closeSettings} size="lg" toolbar={tablist}>
      <div role="tabpanel" id={panelId(activeTab)} aria-labelledby={tabId(activeTab)} className="min-h-64">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'datasources' && <DataSourcesSettings />}
        {activeTab === 'credentials' && <CredentialsSettings />}
      </div>
    </Modal>
  );
}
