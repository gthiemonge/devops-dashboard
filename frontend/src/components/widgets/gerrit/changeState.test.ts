import { describe, expect, it } from 'vitest';
import type { GerritChange } from '@dashboard/shared';
import {
  buildChangeViews,
  dimReason,
  formatVoteGroup,
  getActionInfo,
  isNewChange,
  parseGerritDate,
  signed,
  summarizeCodeReview,
} from './changeState';

const SELF = 100;
const ZUUL = 22348;

type Votes = Array<[accountId: number, value: number]>;

function change(overrides: Partial<GerritChange> & { cr?: Votes; v?: Votes; w?: Votes } = {}): GerritChange {
  const { cr = [], v = [[ZUUL, 1]], w = [], ...rest } = overrides;
  const label = (votes: Votes) => ({ all: votes.map(([id, value]) => ({ _account_id: id, value })) });
  return {
    id: `openstack%2Foctavia~master~I${Math.random().toString(16).slice(2)}`,
    project: 'openstack/octavia',
    branch: 'master',
    subject: 'Fix something',
    status: 'NEW',
    owner: { _account_id: 1, name: 'Alice' },
    created: '2026-10-01 10:00:00.000000000',
    updated: '2026-10-01 10:00:00.000000000',
    insertions: 10,
    deletions: 2,
    _number: 1000,
    mergeable: true,
    labels: { 'Code-Review': label(cr), Verified: label(v), Workflow: label(w) },
    ...rest,
  } as GerritChange;
}

describe('vote formatting', () => {
  it('uses a real minus sign', () => {
    expect(signed(2)).toBe('+2');
    expect(signed(-1)).toBe('−1');
    expect(signed(0)).toBe('0');
  });

  it('shows the count only when several reviewers gave the same vote', () => {
    expect(formatVoteGroup({ value: 2, count: 2 })).toBe('+2×2');
    expect(formatVoteGroup({ value: -1, count: 1 })).toBe('−1');
  });
});

describe('summarizeCodeReview', () => {
  it('keeps the best positive and worst negative votes with their counts', () => {
    const summary = summarizeCodeReview(change({ cr: [[2, 2], [3, 2], [4, 1], [5, -1], [6, -2]] }));
    expect(summary.positive).toEqual({ value: 2, count: 2 });
    expect(summary.negative).toEqual({ value: -2, count: 1 });
    expect(summary.breakdown).toEqual([[2, 2], [1, 1], [-1, 1], [-2, 1]]);
  });

  it("reports the viewer's own vote, ignoring zero votes", () => {
    expect(summarizeCodeReview(change({ cr: [[SELF, 1]] }), SELF).selfVote).toBe(1);
    expect(summarizeCodeReview(change({ cr: [[SELF, 0]] }), SELF).selfVote).toBeUndefined();
    expect(summarizeCodeReview(change({ cr: [[SELF, 1]] })).selfVote).toBeUndefined();
  });
});

describe('dimReason', () => {
  it('dims WIP, bot and DNM/WIP-titled changes', () => {
    expect(dimReason(change({ work_in_progress: true }))).toBe('Work in progress');
    expect(dimReason(change({ owner: { _account_id: 9, tags: ['SERVICE_USER'] } }))).toBe('Bot change');
    expect(dimReason(change({ subject: 'DNM/WIP Testing jobs' }))).toBe('Do not merge');
    expect(dimReason(change({ subject: '[WIP] Add feature' }))).toBe('Work in progress');
    expect(dimReason(change({ subject: 'Fix WIP handling' }))).toBeNull();
  });
});

describe('getActionInfo', () => {
  const approvable = { cr: [[2, 2], [3, 2]] as Votes };

  it('APPROVE needs two +2, CI +1, no Workflow vote, no veto, mergeable', () => {
    expect(getActionInfo(change(approvable))?.label).toBe('APPROVE');
    expect(getActionInfo(change({ cr: [[2, 2]] }))).toBeNull();
    expect(getActionInfo(change({ ...approvable, w: [[2, 1]] }))).toBeNull();
    expect(getActionInfo(change({ ...approvable, v: [] }))).toBeNull();
    expect(getActionInfo(change({ cr: [[2, 2], [3, 2], [4, -2]] }))).toBeNull();
    expect(getActionInfo(change({ ...approvable, mergeable: false }))?.label).toBe('CONFLICT');
    expect(getActionInfo(change({ ...approvable, work_in_progress: true }))?.state).not.toBe('approve');
  });

  it('shows CI failures with the failing vote', () => {
    expect(getActionInfo(change({ v: [[ZUUL, -1]] }))?.label).toBe('CI−1');
  });

  it('ATTN only for the viewer, and blockers take precedence', () => {
    const attention = { attention_set: { [SELF]: { account: { _account_id: SELF }, reason: 'Bob replied' } } };
    expect(getActionInfo(change(attention), SELF)).toMatchObject({ label: 'ATTN', variant: 'neutral' });
    expect(getActionInfo(change(attention), 42)).toBeNull();
    expect(getActionInfo(change({ ...attention, mergeable: false }), SELF)?.label).toBe('CONFLICT');
    expect(getActionInfo(change({ ...attention, subject: 'DNM test' }), SELF)).toBeNull();
  });
});

describe('isNewChange', () => {
  const cutoff = new Date('2026-10-01T08:00:00Z');

  it('parses Gerrit timestamps as UTC', () => {
    expect(parseGerritDate('2026-10-01 10:00:00.000000000').toISOString()).toBe('2026-10-01T10:00:00.000Z');
  });

  it('is new when created after the cutoff, except bot and own changes', () => {
    expect(isNewChange(change(), cutoff)).toBe(true);
    expect(isNewChange(change({ created: '2026-10-01 07:59:00.000000000' }), cutoff)).toBe(false);
    expect(isNewChange(change({ owner: { _account_id: 9, tags: ['SERVICE_USER'] } }), cutoff)).toBe(false);
    expect(isNewChange(change({ owner: { _account_id: SELF } }), cutoff, SELF)).toBe(false);
  });
});

describe('buildChangeViews sorting', () => {
  it('orders APPROVE > ATTN > not voted > voted/own > blocked > dimmed, then by update', () => {
    const at = (h: number) => `2026-10-01 ${String(h).padStart(2, '0')}:00:00.000000000`;
    const changes = [
      change({ _number: 6, subject: 'WIP thing', updated: at(23) }),
      change({ _number: 5, mergeable: false, updated: at(22) }),
      change({ _number: 4, cr: [[SELF, 1]], updated: at(21) }),
      change({ _number: 31, updated: at(10) }),
      change({ _number: 32, updated: at(20) }),
      change({ _number: 2, attention_set: { [SELF]: { account: { _account_id: SELF } } }, updated: at(1) }),
      change({ _number: 1, cr: [[2, 2], [3, 2]], updated: at(0) }),
    ];
    const order = buildChangeViews(changes, SELF, new Date(0)).map((v) => v.change._number);
    expect(order).toEqual([1, 2, 32, 31, 4, 5, 6]);
  });
});
