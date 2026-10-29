import type { Status, Task, TaskType, TrackerData } from '../types/schema';
import { effectiveDueDate, isOverdue, todayIso } from './dates';

export interface TaskFilters {
  q: string;
  phaseId: string;
  status: Status | '';
  type: TaskType | '';
  tag: string;
  overdue: boolean;
}

export const NO_FILTERS: TaskFilters = { q: '', phaseId: '', status: '', type: '', tag: '', overdue: false };

export const hasFilters = (f: TaskFilters) =>
  Boolean(f.q.trim() || f.phaseId || f.status || f.type || f.tag || f.overdue);

/** Search matches title, notes, tags and resource titles, case-insensitively. */
export function filterTasks(d: TrackerData, f: TaskFilters, today = todayIso()): Task[] {
  const q = f.q.trim().toLowerCase();
  return Object.values(d.tasks).filter((t) => {
    const week = d.weeks[t.weekId];
    if (f.phaseId && week?.phaseId !== f.phaseId) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.type && t.type !== f.type) return false;
    if (f.tag && !t.tags.includes(f.tag)) return false;
    if (f.overdue && !isOverdue(t, effectiveDueDate(t, week, d.settings), today)) return false;
    if (!q) return true;
    return [t.title, t.notes, ...t.tags, ...t.resources.map((r) => r.title)].some((s) => s.toLowerCase().includes(q));
  });
}

export const allTags = (d: TrackerData) => [...new Set(Object.values(d.tasks).flatMap((t) => t.tags))].sort();
