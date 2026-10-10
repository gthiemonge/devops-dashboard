import { describe, expect, it } from 'vitest';
import { formatDuration, formatRelative } from './format';

describe('formatRelative', () => {
  const now = Date.UTC(2026, 9, 10, 12);
  const ago = (ms: number) => now - ms;
  const MIN = 60_000;
  const DAY = 24 * 60 * MIN;

  it('uses compact relative units', () => {
    expect(formatRelative(ago(30_000), now)).toBe('now');
    expect(formatRelative(ago(5 * MIN), now)).toBe('5m');
    expect(formatRelative(ago(3 * 60 * MIN), now)).toBe('3h');
    expect(formatRelative(ago(2 * DAY), now)).toBe('2d');
  });

  it('shows a date after a week, with the year after about 11 months', () => {
    expect(formatRelative(ago(9 * DAY), now)).toBe('Oct 1');
    expect(formatRelative(ago(400 * DAY), now)).toBe('Sep 2025');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatRelative('not a date', now)).toBe('');
  });
});

describe('formatDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatDuration(42)).toBe('42s');
    expect(formatDuration(300)).toBe('5m');
    expect(formatDuration(3900)).toBe('1h05m');
  });

  it('returns an empty string for missing or invalid values', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(undefined)).toBe('');
    expect(formatDuration(-1)).toBe('');
  });
});
