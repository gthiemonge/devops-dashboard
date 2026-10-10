/**
 * Groups Zuul builds by (job_name, branch) for the periodic jobs widget.
 *
 * - Builds Zuul retries automatically (final === false, result RETRY) are kept as 'retry': a
 *   warning, not a failure. They neither break nor extend the failure streak.
 * - SUCCESS counts as a pass; SKIPPED / ABORTED / CANCELED / DEQUEUED and unfinished builds
 *   (no result) are neither pass nor fail and are ignored; every other result is a failure
 *   (FAILURE, POST_FAILURE, TIMED_OUT, NODE_FAILURE, RETRY_LIMIT, ERROR, ...).
 */
import type { ZuulBuild } from '@dashboard/shared';

export type RunOutcome = 'pass' | 'fail' | 'retry';

export interface ZuulRun {
  build: ZuulBuild;
  outcome: RunOutcome;
  /** end_time (or start_time for builds without one), epoch ms. */
  time: number;
}

export interface ZuulJobGroup {
  key: string;
  jobName: string;
  branch: string;
  voting: boolean;
  /** Counted runs, newest first. */
  runs: ZuulRun[];
  /** Number of consecutive failures, counting back from the newest run (0 = passing). Retries are skipped. */
  streak: number;
  /** Runs that passed or failed (retries excluded). */
  completedRuns: number;
  lastSuccess: ZuulRun | null;
  latestFailure: ZuulRun | null;
  /** Retries, newest first. */
  retries: ZuulRun[];
  latest: ZuulRun;
}

const IGNORED_RESULTS = new Set(['SKIPPED', 'ABORTED', 'CANCELED', 'DEQUEUED']);

function outcomeOf(build: ZuulBuild): RunOutcome | null {
  const result = build.result;
  if (build.final === false || result === 'RETRY') return 'retry';
  if (!result || IGNORED_RESULTS.has(result)) return null;
  return result === 'SUCCESS' ? 'pass' : 'fail';
}

function timeOf(build: ZuulBuild): number {
  const t = new Date(build.end_time || build.start_time).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function groupBuilds(builds: ZuulBuild[]): ZuulJobGroup[] {
  const byKey = new Map<string, ZuulRun[]>();
  for (const build of builds) {
    const outcome = outcomeOf(build);
    if (!outcome) continue;
    const key = `${build.job_name}\u0000${build.ref?.branch ?? ''}`;
    let runs = byKey.get(key);
    if (!runs) byKey.set(key, (runs = []));
    runs.push({ build, outcome, time: timeOf(build) });
  }

  const groups: ZuulJobGroup[] = [];
  for (const [key, runs] of byKey) {
    runs.sort((a, b) => b.time - a.time);
    const completed = runs.filter((r) => r.outcome !== 'retry');
    const firstPass = completed.findIndex((r) => r.outcome === 'pass');
    const streak = firstPass === -1 ? completed.length : firstPass;
    const latest = runs[0];
    groups.push({
      key,
      jobName: latest.build.job_name,
      branch: latest.build.ref?.branch ?? '',
      voting: latest.build.voting !== false,
      runs,
      streak,
      completedRuns: completed.length,
      lastSuccess: firstPass === -1 ? null : completed[firstPass],
      latestFailure: completed.find((r) => r.outcome === 'fail') ?? null,
      retries: runs.filter((r) => r.outcome === 'retry'),
      latest,
    });
  }
  return groups;
}

/** Newest failure or retry: what makes the group worth showing. */
export function latestProblem(group: ZuulJobGroup): ZuulRun | null {
  const failure = group.latestFailure;
  const retry = group.retries[0] ?? null;
  if (!failure) return retry;
  if (!retry) return failure;
  return retry.time > failure.time ? retry : failure;
}

/** Voting first, then longest failure streak, then most retries, then most recent problem. */
export function compareGroups(a: ZuulJobGroup, b: ZuulJobGroup): number {
  if (a.voting !== b.voting) return a.voting ? -1 : 1;
  if (a.streak !== b.streak) return b.streak - a.streak;
  if (a.retries.length !== b.retries.length) return b.retries.length - a.retries.length;
  return (latestProblem(b)?.time ?? 0) - (latestProblem(a)?.time ?? 0);
}
