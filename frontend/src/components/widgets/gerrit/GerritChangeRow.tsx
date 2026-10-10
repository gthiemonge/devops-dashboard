import type { GerritChange } from '@dashboard/shared';
import { Chip, MetaItem, MetaLine, NewDot, RowLink, RowTitle } from '../../ui';
import { cx } from '../../../lib/cx';
import { formatAbsolute, formatRelative } from '../../../lib/format';
import {
  MINUS,
  formatVoteGroup,
  labelVotes,
  parseGerritDate,
  summarizeCodeReview,
  voteBreakdownTitle,
  type ChangeView,
} from './changeState';

const DEFAULT_GERRIT_URL = 'https://review.opendev.org';

export interface GerritChangeRowProps {
  view: ChangeView;
  selfId?: number;
  /** Show the owner in the meta line (hidden in owner-scoped widgets). */
  showOwner?: boolean;
  /** Show "PS12" for long-running changes (hidden in very narrow widgets). */
  showPatchSet?: boolean;
  /** Gerrit web base URL (data source), default review.opendev.org. */
  baseUrl?: string;
}

function ownerName(change: GerritChange): string {
  const o = change.owner;
  return o.display_name || o.name || o.username || `#${o._account_id}`;
}

function SizeItem({ change }: { change: GerritChange }) {
  const ins = change.insertions ?? 0;
  const del = change.deletions ?? 0;
  const lines = ins + del;
  return (
    <MetaItem
      mono
      className={cx(lines <= 30 && 'text-ok', lines > 300 && 'text-warn')}
      title={`${ins} ${ins === 1 ? 'line' : 'lines'} added, ${del} removed${lines > 300 ? ' (large change)' : lines <= 30 ? ' (small change)' : ''}`}
    >
      +{ins} {MINUS}{del}
    </MetaItem>
  );
}

function Votes({ change, selfId }: { change: GerritChange; selfId?: number }) {
  const cr = summarizeCodeReview(change, selfId);
  const workflow = labelVotes(change, 'Workflow');
  const wPlus = workflow.some((v) => v.value > 0);
  const wMinus = workflow.some((v) => v.value < 0);
  const selfSign = cr.selfVote != null ? Math.sign(cr.selfVote) : 0;

  return (
    <>
      {cr.positive && (
        <Chip variant="ok" emphasis={selfSign > 0} title={voteBreakdownTitle(cr, 1)}>
          CR{formatVoteGroup(cr.positive)}
        </Chip>
      )}
      {cr.negative && (
        <Chip variant="danger" emphasis={selfSign < 0} title={voteBreakdownTitle(cr, -1)}>
          CR{formatVoteGroup(cr.negative)}
        </Chip>
      )}
      {wPlus && (
        <Chip variant="info" title="Approved (Workflow +1)">
          W+1
        </Chip>
      )}
      {wMinus && (
        <Chip variant="danger" title={`Do not merge yet (Workflow ${MINUS}1)`}>
          W{MINUS}1
        </Chip>
      )}
    </>
  );
}

/**
 * One Gerrit change:
 *   [•] subject                                         [ACTION] [CR+2×2] [CR−1] [W+1] [💬 3]
 *   #123 · project · owner · +468 −16 · PS12 · 3h
 */
export function GerritChangeRow({ view, selfId, showOwner = true, showPatchSet = true, baseUrl = DEFAULT_GERRIT_URL }: GerritChangeRowProps) {
  const { change, action, dimReason, isNew } = view;
  const updated = parseGerritDate(change.updated);
  const unresolved = change.unresolved_comment_count ?? 0;
  const ps = change.current_revision_number;
  const project = change.project.replace(/^openstack\//, '');

  return (
    <RowLink
      href={`${baseUrl.replace(/\/$/, '')}/c/${change.project}/+/${change._number}`}
      dimmed={dimReason != null}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <RowTitle className="flex-1" title={dimReason ? `${change.subject}\n(${dimReason})` : change.subject}>
            {isNew && <NewDot className="mr-1.5 align-middle" title="New change" />}
            {change.subject}
          </RowTitle>
          <div className="flex shrink-0 items-center gap-1">
            {action && (
              <Chip variant={action.variant} title={action.title}>
                {action.label}
              </Chip>
            )}
            <Votes change={change} selfId={selfId} />
            {unresolved > 0 && (
              <Chip
                variant="neutral"
                icon="comment"
                title={`${unresolved} unresolved ${unresolved === 1 ? 'comment' : 'comments'}`}
              >
                {unresolved}
              </Chip>
            )}
          </div>
        </div>
        <MetaLine>
          <MetaItem mono>#{change._number}</MetaItem>
          <MetaItem truncate title={change.project}>
            {project}
          </MetaItem>
          {change.branch !== 'master' && change.branch !== 'main' && (
            <MetaItem mono title={`Branch ${change.branch}`}>
              {change.branch.replace(/^stable\//, '')}
            </MetaItem>
          )}
          {showOwner && (
            <MetaItem
              truncate
              className="max-w-40 shrink-[4]"
              title={`Owner: ${ownerName(change)}`}
            >
              {ownerName(change)}
            </MetaItem>
          )}
          <SizeItem change={change} />
          {showPatchSet && ps != null && ps >= 10 && (
            <MetaItem mono title={`Patch set ${ps}`}>
              PS{ps}
            </MetaItem>
          )}
          <MetaItem mono title={`Updated ${formatAbsolute(updated)}`}>
            {formatRelative(updated)}
          </MetaItem>
        </MetaLine>
      </div>
    </RowLink>
  );
}
