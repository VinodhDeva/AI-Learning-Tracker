import { beforeEach, describe, expect, it } from 'vitest';
import { useTracker } from './useTracker';
import { createSeed } from '../lib/seed';
import { TrackerData } from '../types/schema';

const s = () => useTracker.getState();
const firstWeekId = () => Object.values(s().data.weeks).find((w) => w.weekNumber === 1)!.id;

beforeEach(() => s().replaceAll(createSeed(new Date(2026, 0, 7))));

describe('seed', () => {
  it('is valid, has 16 numbered weeks, a side track and 5 projects', () => {
    const d = s().data;
    expect(TrackerData.safeParse(d).success).toBe(true);
    const nums = Object.values(d.weeks).map((w) => w.weekNumber).filter((n) => n !== null).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(Object.values(d.phases).filter((p) => p.kind === 'side')).toHaveLength(1);
    expect(Object.keys(d.projects)).toHaveLength(5);
    expect(d.settings.startDate).toBe('2026-01-05'); // Monday of that week
  });
});

describe('tasks', () => {
  it('adds with defaults and appends order', () => {
    const weekId = firstWeekId();
    const id = s().addTask(weekId, { title: 'New thing', estimatedHours: 3 });
    const t = s().data.tasks[id]!;
    expect(t).toMatchObject({ title: 'New thing', estimatedHours: 3, status: 'not_started', weekId });
    const siblings = Object.values(s().data.tasks).filter((x) => x.weekId === weekId);
    expect(t.order).toBe(Math.max(...siblings.map((x) => x.order)));
  });

  it('rejects invalid updates and leaves data unchanged', () => {
    const id = s().addTask(firstWeekId(), { title: 'x' });
    const before = s().data;
    expect(() => s().updateTask(id, { title: '' })).toThrow();
    expect(s().data).toBe(before);
  });

  it('deleting a task removes its time logs', () => {
    const id = s().addTask(firstWeekId(), { title: 'x' });
    s().logHours(id, '2026-01-06', 2);
    s().deleteTask(id);
    expect(s().data.tasks[id]).toBeUndefined();
    expect(Object.values(s().data.timeLogs)).toHaveLength(0);
  });

  it('moves a task to another week with the given order', () => {
    const weeks = Object.values(s().data.weeks).filter((w) => w.weekNumber !== null);
    const [from, to] = [weeks[0]!.id, weeks[1]!.id];
    const id = s().addTask(from, { title: 'mover' });
    const targetIds = Object.values(s().data.tasks).filter((t) => t.weekId === to).map((t) => t.id);
    s().moveTask(id, to, [id, ...targetIds]);
    expect(s().data.tasks[id]).toMatchObject({ weekId: to, order: 0 });
    expect(s().data.tasks[targetIds[0]!]!.order).toBe(1);
  });
});

describe('weeks and phases', () => {
  it('markWeekDone completes the week and all its tasks', () => {
    const weekId = firstWeekId();
    s().markWeekDone(weekId);
    expect(s().data.weeks[weekId]!.status).toBe('done');
    const tasks = Object.values(s().data.tasks).filter((t) => t.weekId === weekId);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.status === 'done')).toBe(true);
  });

  it('deletePhase cascades to weeks, tasks, logs and projects', () => {
    const phaseId = s().data.weeks[firstWeekId()]!.phaseId;
    const taskId = Object.values(s().data.tasks).find((t) => t.weekId === firstWeekId())!.id;
    s().logHours(taskId, '2026-01-06', 1);
    s().deletePhase(phaseId);
    const d = s().data;
    expect(d.phases[phaseId]).toBeUndefined();
    expect(Object.values(d.weeks).some((w) => w.phaseId === phaseId)).toBe(false);
    expect(d.tasks[taskId]).toBeUndefined();
    expect(Object.keys(d.timeLogs)).toHaveLength(0);
    expect(Object.values(d.projects).some((p) => p.phaseId === phaseId)).toBe(false);
  });

  it('reorderPhases rewrites order by position', () => {
    const ids = Object.values(s().data.phases).sort((a, b) => a.order - b.order).map((p) => p.id).reverse();
    s().reorderPhases(ids);
    ids.forEach((id, i) => expect(s().data.phases[id]!.order).toBe(i));
  });
});
