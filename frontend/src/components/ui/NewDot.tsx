/**
 * The "new item" marker dot (6px, `new` token).
 *
 *   {isNew && <NewDot />}
 *   <NewDot className="mr-1.5" />
 *
 * Has an accessible name ("New") and a tooltip.
 */
import { cx } from '../../lib/cx';

export interface NewDotProps {
  className?: string;
  /** Tooltip / accessible name. Default "New". */
  title?: string;
}

export function NewDot({ className, title = 'New' }: NewDotProps) {
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={cx('inline-block size-1.5 shrink-0 rounded-full bg-new', className)}
    />
  );
}
