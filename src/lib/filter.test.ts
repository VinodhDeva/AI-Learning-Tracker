import { describe, expect, it } from 'vitest';
import { createSeed } from './seed';
import { NO_FILTERS, filterTasks, hasFilters } from './filter';
import { currentWeek, upcoming } from './progress';

const seed = () => createSeed(new Date(2026, 0, 5)); // start Mon 2026-01-05

describe('filterTasks', () => {
  it('returns everything with no filters', () => {
    const d = seed();
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(filterTasks(d, NO_FILTERS)).toHaveLength(Object.keys(d.tasks).length);
  });

  it('searches title, tags and resource titles case-insensitively', () => {
    const d = seed();
    expect(filterTasks(d, { ...NO_FILTERS, q: 'NUMPY' }).map((t) => t.title)).toContain('NumPy quickstart');
    expect(filterTasks(d, { ...NO_FILTERS, q: 'illustrated transformer' }).map((t) => t.title))
      .toEqual(['Attention and the transformer block']);
  });

  it('combines phase, type, tag and overdue filters', () => {
    const d = seed();
    const side = Object.values(d.phases).find((p) => p.kind === 'side')!;
    const sideTasks = filterTasks(d, { ...NO_FILTERS, phaseId: side.id });
    expect(sideTasks.length).toBe(5);
    expect(filterTasks(d, { ...NO_FILTERS, phaseId: side.id, tag: 'dsa' })).toHaveLength(3);
    expect(filterTasks(d, { ...NO_FILTERS, type: 'review' }).every((t) => t.type === 'review')).toBe(true);
    // On 2026-01-12, only week-1 tasks (due 01-11) are overdue.
    const overdue = filterTasks(d, { ...NO_FILTERS, overdue: true }, '2026-01-12');
    expect(overdue.map((t) => d.weeks[t.weekId]!.weekNumber)).toEqual(overdue.map(() => 1));
    expect(overdue.length).toBe(4);
  });
});

describe('dashboard selectors', () => {
  it('finds the current week and lists overdue first', () => {
    const d = seed();
    expect(currentWeek(d, '2026-01-14')?.weekNumber).toBe(2);
    expect(currentWeek(d, '2025-12-01')).toBeUndefined();
    const items = upcoming(d, 6, '2026-01-12');
    expect(items).toHaveLength(6);
    expect(items.slice(0, 4).every((i) => i.overdue)).toBe(true);
    expect(items[4]).toMatchObject({ overdue: false, due: '2026-01-18' });
  });
});
