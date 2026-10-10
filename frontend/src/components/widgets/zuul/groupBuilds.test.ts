import { describe, expect, it } from 'vitest';
import type { ZuulBuild } from '@dashboard/shared';
import { compareGroups, groupBuilds, latestProblem } from './groupBuilds';

let seq = 0;

/** A build that ended `hoursAgo` hours before 2026-10-10T12:00Z. */
function build(
  job: string,
  result: string,
  hoursAgo: number,
  extra: Partial<ZuulBuild> & { branch?: string } = {},
): ZuulBuild {
  const { branch = 'master', ...rest } = extra;
  const end = new Date(Date.UTC(2026, 9, 10, 12) - hoursAgo * 3600_000).toISOString();
  return {
    uuid: `uuid-${seq++}`,
    job_name: job,
    result,
    start_time: end,
    end_time: end,
    duration: 600,
    pipeline: 'periodic',
    log_url: `https://logs.example/${seq}/`,
    event_id: 'e',
    ref: { project: 'openstack/octavia', branch } as ZuulBuild['ref'],
    final: true,
    voting: true,
    ...rest,
  };
}

describe('groupBuilds', () => {
  it('groups by job and branch, newest run first', () => {
    const groups = groupBuilds([
      build('tox', 'SUCCESS', 30),
      build('tox', 'FAILURE', 5),
      build('tox', 'FAILURE', 1, { branch: 'stable/2026.2' }),
    ]);
    expect(groups.map((g) => `${g.jobName}@${g.branch}`).sort()).toEqual(['tox@master', 'tox@stable/2026.2']);
    const master = groups.find((g) => g.branch === 'master')!;
    expect(master.runs.map((r) => r.outcome)).toEqual(['fail', 'pass']);
    expect(master.streak).toBe(1);
    expect(master.lastSuccess?.build.result).toBe('SUCCESS');
  });

  it('keeps retries as warnings that neither break nor extend the failure streak', () => {
    const [group] = groupBuilds([
      build('tox', 'SUCCESS', 50),
      build('tox', 'FAILURE', 30),
      build('tox', 'RETRY', 20, { final: false }),
      build('tox', 'FAILURE', 10),
      build('tox', 'FAILURE', 2, { final: false }),
    ]);
    expect(group.runs.map((r) => r.outcome)).toEqual(['retry', 'fail', 'retry', 'fail', 'pass']);
    expect(group.streak).toBe(2);
    expect(group.retries).toHaveLength(2);
    expect(group.completedRuns).toBe(3);
    expect(latestProblem(group)?.outcome).toBe('retry');
  });

  it('ignores skipped, aborted and unfinished builds', () => {
    const [group] = groupBuilds([
      build('tox', 'SUCCESS', 10),
      build('tox', 'SKIPPED', 5),
      build('tox', 'ABORTED', 4),
      build('tox', '', 1),
    ]);
    expect(group.runs).toHaveLength(1);
  });

  it('counts other results (TIMED_OUT, POST_FAILURE, RETRY_LIMIT) as failures', () => {
    const [group] = groupBuilds([
      build('tox', 'TIMED_OUT', 3),
      build('tox', 'POST_FAILURE', 2),
      build('tox', 'RETRY_LIMIT', 1),
    ]);
    expect(group.streak).toBe(3);
    expect(group.lastSuccess).toBeNull();
  });
});

describe('compareGroups', () => {
  it('sorts voting first, then failure streak, then retries', () => {
    const groups = groupBuilds([
      build('nv-broken', 'FAILURE', 1, { voting: false }),
      build('nv-broken', 'FAILURE', 2, { voting: false }),
      build('flaky', 'RETRY', 1, { final: false }),
      build('flaky', 'SUCCESS', 2),
      build('very-flaky', 'RETRY', 1, { final: false }),
      build('very-flaky', 'RETRY', 2, { final: false }),
      build('broken', 'FAILURE', 3),
    ]).sort(compareGroups);
    expect(groups.map((g) => g.jobName)).toEqual(['broken', 'very-flaky', 'flaky', 'nv-broken']);
  });
});
