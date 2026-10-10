import type { DataSourceType } from '@dashboard/shared';
import { Icon, type IconName } from '../ui';
import { cx } from '../../lib/cx';

interface SourceMeta {
  label: string;
  icon: IconName;
  /** Static identity color class (only for the small source icon). */
  color: string;
}

export const SOURCE_META: Record<DataSourceType, SourceMeta> = {
  gerrit: { label: 'Gerrit', icon: 'gerrit', color: 'text-gerrit' },
  zuul: { label: 'Zuul', icon: 'zuul', color: 'text-zuul' },
  irc: { label: 'IRC', icon: 'irc', color: 'text-irc' },
  launchpad: { label: 'Launchpad', icon: 'launchpad', color: 'text-launchpad' },
  github: { label: 'GitHub', icon: 'gerrit', color: 'text-fg-3' },
  jira: { label: 'Jira', icon: 'launchpad', color: 'text-fg-3' },
};

export function SourceIcon({ type, size = 16, className }: { type: DataSourceType; size?: number; className?: string }) {
  const meta = SOURCE_META[type] ?? SOURCE_META.gerrit;
  return <Icon name={meta.icon} size={size} className={cx(meta.color, className)} />;
}
