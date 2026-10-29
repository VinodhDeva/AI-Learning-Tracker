import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Settings, Task, Week } from '../types/schema';

// All dates are local YYYY-MM-DD strings, so they compare correctly as strings.
export const toIso = (d: Date) => format(d, 'yyyy-MM-dd');
export const todayIso = () => toIso(new Date());

export const weekStart = (startDate: string, weekNumber: number) =>
  toIso(addDays(parseISO(startDate), (weekNumber - 1) * 7));

export const weekEnd = (startDate: string, weekNumber: number) =>
  toIso(addDays(parseISO(startDate), weekNumber * 7 - 1));

/** Plan week that contains `today`. Can be < 1 (before start) or past the last week. */
export const currentWeekNumber = (startDate: string, today = todayIso()) =>
  Math.floor(differenceInCalendarDays(parseISO(today), parseISO(startDate)) / 7) + 1;

/** Explicit due date wins; otherwise the end of the task's plan week. Side-track tasks have none. */
export function effectiveDueDate(task: Task, week: Week | undefined, settings: Settings): string | null {
  if (task.dueDate) return task.dueDate;
  return week?.weekNumber ? weekEnd(settings.startDate, week.weekNumber) : null;
}

export const isOverdue = (task: Task, due: string | null, today = todayIso()) =>
  task.status !== 'done' && due !== null && due < today;
