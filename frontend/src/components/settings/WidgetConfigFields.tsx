/**
 * Per-type widget configuration fields, shared by the widget picker (step 2) and the
 * widget config modal so both always show the same fields with the same look.
 */
import type { ReactNode } from 'react';
import type { WidgetType } from '@dashboard/shared';
import { Checkbox, Field, Input, Select, Textarea } from '../ui';

const LP_STATUSES = ['New', 'Incomplete', 'Confirmed', 'Triaged', 'In Progress', 'Fix Committed'];
const LP_DISPLAY_FIELDS = ['title', 'id', 'status', 'reporter', 'assignee', 'tags'];

export interface WidgetConfigFieldsProps {
  type: WidgetType;
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
  /** Stored widget title; only editable (and displayed) for custom queries. */
  title: string;
  onTitleChange: (title: string) => void;
  refreshInterval: number;
  onRefreshIntervalChange: (seconds: number) => void;
}

function CheckboxGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-medium text-fg-2">{legend}</legend>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">{children}</div>
    </fieldset>
  );
}

export function WidgetConfigFields({
  type,
  config,
  onConfigChange,
  title,
  onTitleChange,
  refreshInterval,
  onRefreshIntervalChange,
}: WidgetConfigFieldsProps) {
  const str = (key: string) => (config[key] as string) || '';
  const set = (key: string, value: unknown) => onConfigChange({ ...config, [key]: value });
  const toggleInList = (key: string, item: string, checked: boolean) => {
    const current = (config[key] as string[]) || [];
    set(key, checked ? [...current, item] : current.filter((s) => s !== item));
  };

  const messageFilter = (
    <Field label="Message filter" hint="Optional. Full-text search in the commit message.">
      <Input
        type="text"
        value={str('message')}
        onChange={(e) => set('message', e.target.value)}
        placeholder="DNM, WIP, fix bug"
      />
    </Field>
  );

  const additionalQuery = (
    <Field label="Additional query" hint="Optional. Gerrit search terms added to the widget’s query.">
      <Input
        type="text"
        value={str('query')}
        onChange={(e) => set('query', e.target.value)}
        placeholder="project:openstack/octavia"
        className="font-mono"
      />
    </Field>
  );

  return (
    <div className="space-y-4">
      {type === 'gerrit_recent_changes' && (
        <>
          <Field label="Projects" hint="Comma-separated; wildcards (*) allowed.">
            <Input
              type="text"
              value={str('project')}
              onChange={(e) => set('project', e.target.value)}
              placeholder="openstack/octavia, openstack/neutron"
              className="font-mono"
            />
          </Field>
          <Field label="Branch" hint="Optional. E.g. stable/* for backports.">
            <Input
              type="text"
              value={str('branch')}
              onChange={(e) => set('branch', e.target.value)}
              placeholder="master"
              className="font-mono"
            />
          </Field>
          {messageFilter}
        </>
      )}

      {type === 'gerrit_my_changes' && additionalQuery}

      {type === 'gerrit_user_changes' && (
        <>
          <Field label="Username">
            <Input
              type="text"
              value={str('owner')}
              onChange={(e) => set('owner', e.target.value)}
              placeholder="username or email"
            />
          </Field>
          {messageFilter}
          {additionalQuery}
        </>
      )}

      {type === 'gerrit_custom_query' && (
        <>
          <Field label="Title" hint="Optional. Shown in the widget header; defaults to the query.">
            <Input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={str('query').replace(/\s+/g, ' ').trim() || 'Octavia reviews'}
            />
          </Field>
          <Field label="Query" hint="Any Gerrit search query, used as-is.">
            <Textarea
              value={str('query')}
              onChange={(e) => set('query', e.target.value)}
              rows={3}
              placeholder="project:openstack/octavia status:open -is:wip"
              className="field-sizing-content max-h-56 min-h-20 font-mono"
            />
          </Field>
        </>
      )}

      {type === 'zuul_periodic_jobs' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Project">
              <Input
                type="text"
                value={str('project')}
                onChange={(e) => set('project', e.target.value)}
                placeholder="openstack/octavia"
                className="font-mono"
              />
            </Field>
            <Field label="Pipeline">
              <Input
                type="text"
                value={str('pipeline')}
                onChange={(e) => set('pipeline', e.target.value)}
                placeholder="periodic"
                className="font-mono"
              />
            </Field>
          </div>
          <Field label="Days to look back" hint="Only show failures from the last N days.">
            <div className="w-28">
              <Input
                type="number"
                value={(config.days as number) || 7}
                onChange={(e) => set('days', parseInt(e.target.value) || 7)}
                min={1}
                max={90}
                className="font-mono"
              />
            </div>
          </Field>
        </>
      )}

      {type === 'irc_recent_messages' && (
        <Field label="Channel">
          <Input
            leading="#"
            type="text"
            value={str('channel')}
            onChange={(e) => set('channel', e.target.value)}
            placeholder="openstack-lbaas"
            className="font-mono"
          />
        </Field>
      )}

      {type === 'launchpad_bugs' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Project" hint="Launchpad name, without openstack/.">
              <Input
                type="text"
                value={str('project')}
                onChange={(e) => set('project', e.target.value)}
                placeholder="octavia"
                className="font-mono"
              />
            </Field>
            <Field label="Sort by">
              <Select value={str('sortBy') || 'id'} onChange={(e) => set('sortBy', e.target.value)}>
                <option value="id">Bug number (newest first)</option>
                <option value="importance">Importance</option>
                <option value="status">Status</option>
              </Select>
            </Field>
          </div>
          <CheckboxGroup legend="Bug statuses">
            {LP_STATUSES.map((status) => (
              <Checkbox
                key={status}
                label={status}
                checked={((config.statuses as string[]) || []).includes(status)}
                onChange={(e) => toggleInList('statuses', status, e.target.checked)}
              />
            ))}
          </CheckboxGroup>
          <CheckboxGroup legend="Display fields">
            {LP_DISPLAY_FIELDS.map((field) => (
              <Checkbox
                key={field}
                label={field === 'id' ? 'ID' : field.charAt(0).toUpperCase() + field.slice(1)}
                checked={((config.displayFields as string[]) || []).includes(field)}
                onChange={(e) => toggleInList('displayFields', field, e.target.checked)}
              />
            ))}
          </CheckboxGroup>
          <Field label="Filter by tags" hint="Optional. Comma-separated; only bugs with ALL these tags are shown.">
            <Input
              type="text"
              value={str('tags')}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="sdx-tn, sdx-tpm"
              className="font-mono"
            />
          </Field>
          <Checkbox
            label="Fetch tags"
            description="Slower: requires extra API calls."
            checked={(config.fetchTags as boolean) || false}
            onChange={(e) => set('fetchTags', e.target.checked)}
          />
        </>
      )}

      <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
        <Field label="Max items">
          <Input
            type="number"
            value={(config.limit as number) || 10}
            onChange={(e) => set('limit', parseInt(e.target.value) || 10)}
            min={1}
            max={50}
            className="font-mono"
          />
        </Field>
        <Field label="Refresh every" hint="Seconds (60–3600).">
          <Input
            type="number"
            value={refreshInterval}
            onChange={(e) => onRefreshIntervalChange(parseInt(e.target.value) || 300)}
            min={60}
            max={3600}
            className="font-mono"
          />
        </Field>
      </div>
    </div>
  );
}
