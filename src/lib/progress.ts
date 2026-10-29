import { addDays, parseISO } from 'date-fns';
import type { Task, TimeLog, TrackerData, Week } from '../types/schema';
import { currentWeekNumber, effectiveDueDate, isOverdue, toIso, todayIso, weekEnd, weekStart } from './dates';

/** Tasks in main phases only; the side track does not count toward plan progress. */
export function mainTasks(d: TrackerData): Task[] {
  return Object.values(d.tasks).filter((t) => {
    const week = d.weeks[t.weekId];
    return week !== undefined && d.phases[week.phaseId]?.kind === 'main';
  });
}

/** Whole-number percent of tasks done; 0 when there are no tasks. */
export function percentDone(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100);
}

export const hoursSpent = (taskId: string, logs: TimeLog[]) =>
  logs.reduce((sum, l) => (l.taskId === taskId ? sum + l.hours : sum), 0);

/** Hours logged with from <= date <= to. */
export const hoursBetween = (logs: TimeLog[], from: string, to: string) =>
  logs.reduce((sum, l) => (l.date >= from && l.date <= to ? sum + l.hours : sum), 0);

/** Hours logged in the plan week that contains `today`. */
export function hoursThisWeek(d: TrackerData, today = todayIso()): number {
  const n = currentWeekNumber(d.settings.startDate, today);
  return hoursBetween(Object.values(d.timeLogs), weekStart(d.settings.startDate, n), weekEnd(d.settings.startDate, n));
}

/** A study day has logged hours or a journal entry. */
export function studyDays(d: TrackerData): Set<string> {
  const days = new Set(Object.keys(d.journal));
  for (const l of Object.values(d.timeLogs)) days.add(l.date);
  return days;
}

/** Consecutive study days ending today, or ending yesterday if today has nothing yet. */
export function streak(d: TrackerData, today = todayIso()): number {
  const days = studyDays(d);
  let cursor = parseISO(today);
  if (!days.has(today)) cursor = addDays(cursor, -1);
  let count = 0;
  while (days.has(toIso(cursor))) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** The main-plan week whose date range contains `date`, if any. */
export function weekForDate(d: TrackerData, date: string): Week | undefined {
  const n = currentWeekNumber(d.settings.startDate, date);
  return Object.values(d.weeks).find((w) => w.weekNumber === n && d.phases[w.phaseId]?.kind === 'main');
}

/** The main-plan week containing today, if any. */
export const currentWeek = (d: TrackerData, today = todayIso()) => weekForDate(d, today);

export interface DueItem {
  task: Task;
  week: Week | undefined;
  due: string;
  overdue: boolean;
}

/** Open tasks with a due date, overdue first then soonest, capped at `limit`. */
export function upcoming(d: TrackerData, limit = 8, today = todayIso()): DueItem[] {
  const items: DueItem[] = [];
  for (const task of Object.values(d.tasks)) {
    if (task.status === 'done') continue;
    const week = d.weeks[task.weekId];
    const due = effectiveDueDate(task, week, d.settings);
    if (due) items.push({ task, week, due, overdue: isOverdue(task, due, today) });
  }
  return items.sort((a, b) => a.due.localeCompare(b.due)).slice(0, limit);
}

/** Total logged hours per date. */
export function hoursByDay(d: TrackerData): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of Object.values(d.timeLogs)) out.set(l.date, (out.get(l.date) ?? 0) + l.hours);
  return out;
}
