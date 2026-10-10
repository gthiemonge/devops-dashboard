import { useState, useEffect, type FormEvent } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useUpdateWidget } from '../../hooks/useWidgets';
import { Modal } from './Modal';
import { WidgetConfigFields } from './WidgetConfigFields';
import { SOURCE_META, SourceIcon } from './sources';
import { generateTitle, getWidgetTypeOption } from './widgetTypes';
import { Alert, Button } from '../ui';
import type { UpdateWidgetDto } from '@dashboard/shared';

interface WidgetConfigModalProps {
  widgetId: number;
}

const FORM_ID = 'widget-config-form';

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function WidgetConfigModal({ widgetId }: WidgetConfigModalProps) {
  const { closeWidgetEditor, widgets, dataSources } = useDashboardStore();
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

  const typeOption = getWidgetTypeOption(widget.type);
  const dataSource = dataSources.find((ds) => ds.id === widget.dataSourceId);

  const handleSave = (e?: FormEvent) => {
    e?.preventDefault();
    // The title is only shown (and editable) for custom queries, where an empty title
    // falls back to the query; other widget types keep their stored title unchanged.
    const dto: UpdateWidgetDto = {
      title:
        widget.type === 'gerrit_custom_query' ? title.trim() || generateTitle(widget.type, config) : title,
      config,
      refreshInterval,
    };

    updateWidget.mutate({ id: widgetId, dto }, { onSuccess: () => closeWidgetEditor() });
  };

  const description = typeOption ? (
    <span className="flex min-w-0 items-center gap-1.5">
      <SourceIcon type={typeOption.sourceType} size={12} />
      <span className="truncate">
        {[SOURCE_META[typeOption.sourceType].label, typeOption.name, dataSource?.name].filter(Boolean).join(' · ')}
      </span>
    </span>
  ) : undefined;

  return (
    <Modal
      title="Configure widget"
      description={description}
      onClose={closeWidgetEditor}
      footer={
        <>
          <Button variant="ghost" onClick={closeWidgetEditor}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" disabled={updateWidget.isPending}>
            {updateWidget.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSave}>
        <WidgetConfigFields
          type={widget.type}
          config={config}
          onConfigChange={setConfig}
          title={title}
          onTitleChange={setTitle}
          refreshInterval={refreshInterval}
          onRefreshIntervalChange={setRefreshInterval}
        />
      </form>
      {updateWidget.error && (
        <Alert tone="danger" title="Could not save the widget" className="mt-4" onDismiss={() => updateWidget.reset()}>
          {errorMessage(updateWidget.error)}
        </Alert>
      )}
    </Modal>
  );
}
