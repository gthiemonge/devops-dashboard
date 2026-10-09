import type { GerritChange } from '@dashboard/shared';

// Gerrit reports mergeable: false when the change no longer applies on its branch
export function MergeConflictChip({ change }: { change: GerritChange }) {
  if (change.mergeable !== false) return null;
  return (
    <span
      className="px-1 py-0.5 text-[10px] font-mono font-bold rounded border bg-red-500/20 text-red-400 border-red-500/30"
      title="Merge conflict"
    >
      CONFLICT
    </span>
  );
}
