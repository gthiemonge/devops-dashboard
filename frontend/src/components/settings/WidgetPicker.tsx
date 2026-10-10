import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useCreateWidget } from '../../hooks/useWidgets';
import { Modal } from './Modal';
import { WidgetConfigFields } from './WidgetConfigFields';
import { SOURCE_META, SourceIcon } from './sources';
import { WIDGET_SOURCES, WIDGET_TYPES, generateTitle, type WidgetTypeOption } from './widgetTypes';
import { Alert, Button, Icon } from '../ui';
import { cx } from '../../lib/cx';
import type { CreateWidgetDto } from '@dashboard/shared';

const FORM_ID = 'widget-picker-form';

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function WidgetPicker() {
  const { closeWidgetPicker, dataSources, openSettings } = useDashboardStore();
  const createWidget = useCreateWidget();
  const [selectedType, setSelectedType] = useState<WidgetTypeOption | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [title, setTitle] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(300);
  const stepRef = useRef<HTMLDivElement>(null);
  const lastTypeRef = useRef<string | null>(null);
  const isFirstRender = useRef(true);

  // Move focus when switching steps: first field on step 2, the previously chosen type on step 1.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const root = stepRef.current;
    if (!root) return;
    const target = selectedType
      ? root.querySelector<HTMLElement>('form input, form textarea, form select')
      : root.querySelector<HTMLElement>(`[data-widget-type="${lastTypeRef.current}"]`);
    target?.focus();
  }, [selectedType]);

  const findDataSource = (sourceType: WidgetTypeOption['sourceType']) =>
    dataSources.find((ds) => ds.type === sourceType);

  const handleSelectType = (type: WidgetTypeOption) => {
    lastTypeRef.current = type.type;
    setSelectedType(type);
    setConfig(type.defaultConfig);
    setTitle('');
    setRefreshInterval(300);
    createWidget.reset();
  };

  const dataSource = selectedType ? findDataSource(selectedType.sourceType) : undefined;

  const handleCreate = (e?: FormEvent) => {
    e?.preventDefault();
    if (!selectedType || !dataSource) return;

    const dto: CreateWidgetDto = {
      type: selectedType.type,
      title: title.trim() || generateTitle(selectedType.type, config),
      dataSourceId: dataSource.id,
      config,
      refreshInterval,
    };

    createWidget.mutate(dto, {
      onSuccess: () => closeWidgetPicker(),
    });
  };

  const goToSettings = () => {
    closeWidgetPicker();
    openSettings();
  };

  const typeList = (
    <div className="space-y-5">
      {WIDGET_SOURCES.map((source) => {
        const types = WIDGET_TYPES.filter((t) => t.sourceType === source);
        const configured = !!findDataSource(source);
        const headingId = `widget-picker-${source}`;
        return (
          <section key={source} aria-labelledby={headingId}>
            <div className="mb-2 flex items-center gap-2">
              <SourceIcon type={source} size={14} />
              <h3 id={headingId} className="text-xs font-semibold text-fg-2">
                {SOURCE_META[source].label}
              </h3>
              {!configured && <span className="text-[11px] text-warn">No data source configured</span>}
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {types.map((wt) => (
                <li key={wt.type}>
                  <button
                    type="button"
                    data-widget-type={wt.type}
                    onClick={() => handleSelectType(wt)}
                    className={cx(
                      'group flex h-full w-full items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-left transition-colors',
                      'hover:border-line-strong hover:bg-surface-2',
                      'outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-fg">{wt.name}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-fg-3">{wt.description}</span>
                    </span>
                    <Icon
                      name="chevron-right"
                      size={14}
                      className="mt-0.5 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );

  const sourceLabel = selectedType ? SOURCE_META[selectedType.sourceType].label : '';

  const configStep = selectedType && (
    <>
      <div className="mb-4 flex items-start gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={<Icon name="chevron-right" size={14} className="rotate-180" />}
          aria-label="Back to widget types"
          onClick={() => setSelectedType(null)}
          className="-ml-1.5"
        />
        <SourceIcon type={selectedType.sourceType} className="mt-1.5" />
        <div className="min-w-0 pt-0.5">
          <p className="text-[13px] font-semibold text-fg">
            {selectedType.name}
            <span className="ml-1.5 font-normal text-fg-3">{sourceLabel}</span>
          </p>
          <p className="text-xs text-fg-3">{selectedType.description}</p>
        </div>
      </div>

      {!dataSource && (
        <Alert tone="warn" title={`No ${sourceLabel} data source configured`} className="mb-4">
          Add one under Data sources in{' '}
          <button
            type="button"
            onClick={goToSettings}
            className="font-medium text-fg underline underline-offset-2 hover:text-accent"
          >
            Settings
          </button>{' '}
          before creating this widget.
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={handleCreate}>
        <WidgetConfigFields
          type={selectedType.type}
          config={config}
          onConfigChange={setConfig}
          title={title}
          onTitleChange={setTitle}
          refreshInterval={refreshInterval}
          onRefreshIntervalChange={setRefreshInterval}
        />
      </form>

      {createWidget.error && (
        <Alert tone="danger" title="Could not create the widget" className="mt-4" onDismiss={() => createWidget.reset()}>
          {errorMessage(createWidget.error)}
        </Alert>
      )}
    </>
  );

  return (
    <Modal
      title="Add widget"
      onClose={closeWidgetPicker}
      footerStart={
        selectedType && dataSource ? <span className="block truncate">Data source: {dataSource.name}</span> : null
      }
      footer={
        selectedType ? (
          <>
            <Button variant="ghost" onClick={closeWidgetPicker}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} variant="primary" disabled={createWidget.isPending || !dataSource}>
              {createWidget.isPending ? 'Creating…' : 'Create widget'}
            </Button>
          </>
        ) : null
      }
    >
      <div ref={stepRef}>{selectedType ? configStep : typeList}</div>
    </Modal>
  );
}
