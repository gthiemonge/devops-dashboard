/**
 * Pure Gerrit change helpers shared by every Gerrit widget: vote summaries, the action
 * state chip, dimming, the sort key and the "new" predicate. No React here.
 */
import type { GerritChange, GerritAccount } from '@dashboard/shared';

/** Real minus sign for display (chips, sizes). */
export const MINUS = '−';

export function signed(value: number): string {
  return value > 0 ? `+${value}` : value < 0 ? `${MINUS}${-value}` : '0';
}

// ---------------------------------------------------------------------------
// Votes

interface Vote {
  value: number;
  accountId: number;
}

/** Non-zero votes on a label (Gerrit omits `value` for reviewers without a vote). */
export function labelVotes(change: GerritChange, label: string): Vote[] {
  const all = change.labels?.[label]?.all ?? [];
  const votes: Vote[] = [];
  for (const v of all) {
    if (typeof v.value === 'number' && v.value !== 0) votes.push({ value: v.value, accountId: v._account_id });
  }
  return votes;
}

export interface VoteGroup {
  /** Highest positive value (or lowest negative value). */
  value: number;
  /** Number of votes with exactly that value. */
  count: number;
}

export interface CodeReviewSummary {
  /** Best positive vote and how many reviewers gave it, e.g. {value: 2, count: 2} → "+2×2". */
  positive: VoteGroup | null;
  /** Worst negative vote, e.g. {value: -1, count: 1} → "−1". */
  negative: VoteGroup | null;
  /** Count per value, for tooltips, highest first: [[2, 2], [1, 1], [-1, 1]]. */
  breakdown: Array<[number, number]>;
  /** The viewer's own Code-Review vote (undefined when not voted / self unknown). */
  selfVote?: number;
}

export function summarizeCodeReview(change: GerritChange, selfId?: number): CodeReviewSummary {
  const votes = labelVotes(change, 'Code-Review');
  const counts = new Map<number, number>();
  for (const v of votes) counts.set(v.value, (counts.get(v.value) ?? 0) + 1);
  const breakdown = [...counts.entries()].sort((a, b) => b[0] - a[0]);
  const positives = breakdown.filter(([v]) => v > 0);
  const negatives = breakdown.filter(([v]) => v < 0);
  const best = positives[0];
  const worst = negatives[negatives.length - 1];
  const self = selfId != null ? votes.find((v) => v.accountId === selfId) : undefined;
  return {
    positive: best ? { value: best[0], count: best[1] } : null,
    negative: worst ? { value: worst[0], count: worst[1] } : null,
    breakdown,
    selfVote: self?.value,
  };
}

/** "+2×2", "+1", "−1", "−2×2". */
export function formatVoteGroup(group: VoteGroup): string {
  return group.count > 1 ? `${signed(group.value)}×${group.count}` : signed(group.value);
}

/** Tooltip lines like "2 × Code-Review +2" for the votes of one sign. */
export function voteBreakdownTitle(summary: CodeReviewSummary, sign: 1 | -1): string {
  const lines = summary.breakdown
    .filter(([v]) => Math.sign(v) === sign)
    .map(([v, n]) => `${n} × Code-Review ${signed(v)}`);
  if (summary.selfVote != null && Math.sign(summary.selfVote) === sign) {
    lines.push(`Your vote: ${signed(summary.selfVote)}`);
  }
  return lines.join('\n');
}

function minVote(change: GerritChange, label: string): number {
  return labelVotes(change, label).reduce((m, v) => Math.min(m, v.value), 0);
}

function maxVote(change: GerritChange, label: string): number {
  return labelVotes(change, label).reduce((m, v) => Math.max(m, v.value), 0);
}

// ---------------------------------------------------------------------------
// Dimming (low-priority rows)

const DNM_WIP_SUBJECT = /^\W*(DNM|WIP)\b/i;

export function isBot(account: GerritAccount | undefined): boolean {
  return !!account?.tags?.includes('SERVICE_USER');
}

/** Why a row is dimmed (WIP flag, bot owner, DNM/WIP subject), or null. */
export function dimReason(change: GerritChange): string | null {
  if (change.work_in_progress) return 'Work in progress';
  if (isBot(change.owner)) return 'Bot change';
  const m = DNM_WIP_SUBJECT.exec(change.subject);
  if (m) return m[1].toUpperCase() === 'DNM' ? 'Do not merge' : 'Work in progress';
  return null;
}

// ---------------------------------------------------------------------------
// Action state (one chip per row, highest applicable)

export type ActionState = 'approve' | 'your-turn' | 'conflict' | 'ci-fail';

export interface ActionInfo {
  state: ActionState;
  label: string;
  variant: 'info' | 'warn' | 'danger' | 'neutral';
  title: string;
}

export function getActionInfo(change: GerritChange, selfId?: number): ActionInfo | null {
  const dimmed = dimReason(change) != null;
  const crVotes = labelVotes(change, 'Code-Review');
  const plusTwos = crVotes.filter((v) => v.value >= 2).length;
  const hasVeto = crVotes.some((v) => v.value <= -2);
  const hasWorkflowVote = labelVotes(change, 'Workflow').length > 0;
  const verifiedMin = minVote(change, 'Verified');
  const verifiedMax = maxVote(change, 'Verified');

  // Ready for the final Workflow +1: two cores approved, CI green, applies cleanly.
  if (
    !dimmed &&
    plusTwos >= 2 &&
    !hasVeto &&
    !hasWorkflowVote &&
    verifiedMax > 0 &&
    verifiedMin >= 0 &&
    change.mergeable !== false
  ) {
    return {
      state: 'approve',
      label: 'APPROVE',
      variant: 'info',
      title: `Ready to approve: ${plusTwos} × Code-Review +2, Verified +1, no Workflow vote yet`,
    };
  }
  if (change.mergeable === false) {
    return { state: 'conflict', label: 'CONFLICT', variant: 'danger', title: 'Merge conflict: needs a rebase' };
  }
  if (verifiedMin < 0) {
    return {
      state: 'ci-fail',
      label: `CI${signed(verifiedMin)}`,
      variant: 'danger',
      title: `CI failed (Verified ${signed(verifiedMin)})`,
    };
  }
  // A neutral hint rather than a call to action: OpenDev adds you to the attention set very
  // broadly (any reply on your changes, any change you reviewed). Bot / WIP / DNM changes are
  // low priority: no "your turn" for them.
  if (!dimmed && selfId != null && change.attention_set?.[String(selfId)]) {
    const reason = change.attention_set[String(selfId)].reason;
    return {
      state: 'your-turn',
      label: 'ATTN',
      variant: 'neutral',
      title: reason ? `In your attention set: ${reason}` : 'In your attention set',
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sorting

/**
 * Sort group (lower first): 0 APPROVE · 1 ATTN (in my attention set) · 2 not voted by me · 3 voted by me
 * (or my own change) · 4 blocked (CONFLICT / CI −1) · 5 dimmed (WIP / bot / DNM).
 */
export function sortGroup(change: GerritChange, action: ActionInfo | null, selfId?: number): number {
  if (dimReason(change) != null) return 5;
  if (action?.state === 'approve') return 0;
  if (action?.state === 'your-turn') return 1;
  if (action?.state === 'conflict' || action?.state === 'ci-fail') return 4;
  if (selfId != null) {
    if (change.owner._account_id === selfId) return 3;
    if (labelVotes(change, 'Code-Review').some((v) => v.accountId === selfId)) return 3;
  }
  return 2;
}

export interface ChangeView {
  change: GerritChange;
  action: ActionInfo | null;
  dimReason: string | null;
  group: number;
  isNew: boolean;
}

/** Gerrit timestamps are UTC "YYYY-MM-DD hh:mm:ss.000000000". */
export function parseGerritDate(s: string): Date {
  return new Date(s.includes('T') ? s : `${s.replace(' ', 'T')}Z`);
}

/**
 * New = created after the cutoff, excluding bot changes and the viewer's own changes.
 */
export function isNewChange(change: GerritChange, cutoff: Date, selfId?: number): boolean {
  if (isBot(change.owner)) return false;
  if (selfId != null && change.owner._account_id === selfId) return false;
  return parseGerritDate(change.created) >= cutoff;
}

/** Decorates and sorts changes: by group, then `updated` desc (stable). */
export function buildChangeViews(changes: GerritChange[], selfId: number | undefined, newCutoff: Date): ChangeView[] {
  const views = changes.map((change, index) => {
    const action = getActionInfo(change, selfId);
    return {
      view: {
        change,
        action,
        dimReason: dimReason(change),
        group: sortGroup(change, action, selfId),
        isNew: isNewChange(change, newCutoff, selfId),
      },
      updated: parseGerritDate(change.updated).getTime(),
      index,
    };
  });
  views.sort((a, b) => a.view.group - b.view.group || b.updated - a.updated || a.index - b.index);
  return views.map((v) => v.view);
}
