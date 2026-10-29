import { describe, expect, it } from 'vitest';
import { createSeed } from './seed';
import { hoursThisWeek, mainTasks, percentDone, streak } from './progress';
import { currentWeekNumber, effectiveDueDate, isOverdue, weekEnd } from './dates';
import { parseBackup, exportJson } from './backup';
import type { Task, TrackerData } from '../types/schema';

const seed = () => createSeed(new Date(2026, 0, 5)); // start 2026-01-05 (Mon)
const log = (d: TrackerData, date: string, hours: number) => {
  const taskId = Object.keys(d.tasks)[0]!;
  d.timeLogs[date + hours] = { id: date + hours, taskId, date, hours };
};

describe('percentDone', () => {
  it('is 0 for no tasks and rounds', () => {
    expect(percentDone([])).toBe(0);
    const t = (status: Task['status']) => ({ status }) as Task;
    expect(percentDone([t('done'), t('not_started'), t('in_progress')])).toBe(33);
  });

  it('mainTasks excludes the side track', () => {
    const d = seed();
    const side = Object.values(d.phases).find((p) => p.kind === 'side')!;
    const sideWeekIds = new Set(Object.values(d.weeks).filter((w) => w.phaseId === side.id).map((w) => w.id));
    expect(mainTasks(d).some((t) => sideWeekIds.has(t.weekId))).toBe(false);
    expect(mainTasks(d).length).toBeLessThan(Object.keys(d.tasks).length);
  });
});

describe('dates', () => {
  it('computes week numbers and week ends from start date', () => {
    expect(currentWeekNumber('2026-01-05', '2026-01-05')).toBe(1);
    expect(currentWeekNumber('2026-01-05', '2026-01-11')).toBe(1);
    expect(currentWeekNumber('2026-01-05', '2026-01-12')).toBe(2);
    expect(currentWeekNumber('2026-01-05', '2026-01-01')).toBe(0);
    expect(weekEnd('2026-01-05', 1)).toBe('2026-01-11');
    expect(weekEnd('2026-01-05', 16)).toBe('2026-04-26');
  });

  it('falls back to week end for due date and flags overdue', () => {
    const d = seed();
    const week = Object.values(d.weeks).find((w) => w.weekNumber === 2)!;
    const task = Object.values(d.tasks).find((t) => t.weekId === week.id)!;
    expect(effectiveDueDate(task, week, d.settings)).toBe('2026-01-18');
    expect(effectiveDueDate({ ...task, dueDate: '2026-01-14' }, week, d.settings)).toBe('2026-01-14');
    expect(isOverdue(task, '2026-01-18', '2026-01-19')).toBe(true);
    expect(isOverdue({ ...task, status: 'done' }, '2026-01-18', '2026-01-19')).toBe(false);
  });
});

describe('hours and streak', () => {
  it('sums hours in the current plan week only', () => {
    const d = seed();
    log(d, '2026-01-11', 2); // week 1
    log(d, '2026-01-12', 1.5); // week 2
    log(d, '2026-01-18', 1); // week 2
    expect(hoursThisWeek(d, '2026-01-14')).toBe(2.5);
  });

  it('counts consecutive study days, tolerating an empty today', () => {
    const d = seed();
    log(d, '2026-01-10', 1);
    d.journal['2026-01-11'] = { date: '2026-01-11', whatILearned: 'x', blockers: '', nextSteps: '' };
    log(d, '2026-01-12', 1);
    expect(streak(d, '2026-01-12')).toBe(3);
    expect(streak(d, '2026-01-13')).toBe(3);
    expect(streak(d, '2026-01-14')).toBe(0);
  });
});

describe('backup', () => {
  it('round-trips and rejects bad input', () => {
    const d = seed();
    expect(parseBackup(exportJson(d))).toEqual({ ok: true, data: d });
    expect(parseBackup('nope')).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ ...d, version: 2 }))).toMatchObject({ ok: false });
  });
});
