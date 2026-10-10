/**
 * List row primitives shared by every list widget.
 *
 *   <RowLink href={url} dimmed={isWip}>
 *     <div className="min-w-0 flex-1">
 *       <RowTitle>{isNew && <NewDot className="mr-1.5" />}{subject}</RowTitle>
 *       <MetaLine>
 *         <MetaItem mono>#{number}</MetaItem>
 *         <MetaItem truncate>{project}</MetaItem>
 *         <MetaItem mono title={formatAbsolute(updated)}>{formatRelative(updated)}</MetaItem>
 *       </MetaLine>
 *     </div>
 *     <Chip variant="info">APPROVE</Chip>
 *   </RowLink>
 *
 * RowLink: flex row, 8px horizontal padding, hover bg-surface-2, focus-visible ring,
 * opens in a new tab by default. Without `href` it renders a non-interactive <div>.
 * `dimmed` marks low-priority rows (WIP / bot): RowTitle switches to fg-3 (still ≥ 4.5:1),
 * and any child can react with `group-data-[dimmed=true]/row:<utility>`.
 */
import { Children, Fragment, isValidElement, type AnchorHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../lib/cx';

const ROW =
  'group/row flex min-w-0 items-center gap-2 px-2 py-1.5 text-[13px] text-fg-2 transition-colors';

export interface RowLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Low-priority row (WIP, bot, DNM). */
  dimmed?: boolean;
  /** Open in a new tab (target=_blank, rel=noopener). Default true. */
  external?: boolean;
}

export function RowLink({ href, dimmed = false, external = true, className, children, ...rest }: RowLinkProps) {
  if (!href) {
    return (
      <div
        data-dimmed={dimmed}
        className={cx(ROW, className)}
        {...(rest as HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </div>
    );
  }
  return (
    <a
      href={href}
      data-dimmed={dimmed}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cx(
        ROW,
        'hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-offset-[-2px]',
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}

export interface RowTitleProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Row primary text: 13px, fg (fg-3 in a dimmed row), single line truncated. */
export function RowTitle({ className, children, ...rest }: RowTitleProps) {
  return (
    <div
      className={cx(
        'min-w-0 truncate text-[13px] leading-5 text-fg group-data-[dimmed=true]/row:text-fg-3',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface MetaLineProps {
  children?: ReactNode;
  className?: string;
}

/**
 * Second row line: children separated by "·", one line, never wraps.
 * null/false/'' children are skipped (no dangling separators).
 * Wrap long parts in <MetaItem truncate> so they shrink; everything else keeps its width.
 */
export function MetaLine({ children, className }: MetaLineProps) {
  const items = flatten(children).filter((c) => c !== null && c !== undefined && c !== false && c !== '');
  return (
    <div
      className={cx(
        'flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-[11px] leading-4 text-fg-3',
        className,
      )}
    >
      {items.map((child, i) => (
        <Fragment key={isValidElement(child) && child.key != null ? child.key : i}>
          {i > 0 && (
            <span aria-hidden className="shrink-0 text-fg-3">
              ·
            </span>
          )}
          {isValidElement(child) ? child : <span className="shrink-0">{child}</span>}
        </Fragment>
      ))}
    </div>
  );
}

function flatten(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  Children.forEach(children, (c) => {
    if (isValidElement<{ children?: ReactNode }>(c) && c.type === Fragment) {
      out.push(...flatten(c.props.children));
    } else {
      out.push(c);
    }
  });
  return out;
}

export interface MetaItemProps extends HTMLAttributes<HTMLSpanElement> {
  /** Monospace + tabular numbers (numbers, sizes, times). */
  mono?: boolean;
  /** Allow this item to shrink with an ellipsis (project, owner). Otherwise it never shrinks. */
  truncate?: boolean;
}

export function MetaItem({ mono = false, truncate = false, className, children, ...rest }: MetaItemProps) {
  return (
    <span
      className={cx(
        truncate ? 'min-w-0 truncate' : 'shrink-0',
        mono && 'font-mono tabular-nums',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
