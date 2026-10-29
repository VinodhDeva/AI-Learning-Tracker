import { create } from 'zustand';
import {
  JournalEntry,
  Phase,
  Project,
  Settings,
  Task,
  TimeLog,
  TrackerData,
  Week,
} from '../types/schema';
import { createSeed } from '../lib/seed';
import { newId } from '../lib/id';
import type { Repository } from './repository';

type Patch<T> = Partial<Omit<T, 'id'>>;
type Input<T, Fixed extends keyof T> = Partial<Omit<T, 'id' | 'order' | Fixed>>;

export interface TrackerState {
  data: TrackerData;
  saveError: string | null;

  replaceAll(data: TrackerData): void;
  resetToSeed(): void;
  updateSettings(patch: Partial<Settings>): void;

  addPhase(input: Input<Phase, never>): string;
  updatePhase(id: string, patch: Patch<Phase>): void;
  deletePhase(id: string): void;
  reorderPhases(ids: string[]): void;

  addWeek(phaseId: string, input?: Input<Week, 'phaseId'>): string;
  updateWeek(id: string, patch: Patch<Week>): void;
  deleteWeek(id: string): void;
  reorderWeeks(ids: string[]): void;
  markWeekDone(id: string): void;

  addTask(weekId: string, input: Input<Task, 'weekId'> & { title: string }): string;
  updateTask(id: string, patch: Patch<Task>): void;
  deleteTask(id: string): void;
  /** Move a task to `weekId` (same or different) and set that week's order to `orderedIds`. */
  moveTask(id: string, weekId: string, orderedIds: string[]): void;

  logHours(taskId: string, date: string, hours: number): string;
  deleteTimeLog(id: string): void;

  addProject(phaseId: string, input: Input<Project, 'phaseId'> & { name: string }): string;
  updateProject(id: string, patch: Patch<Project>): void;
  deleteProject(id: string): void;
  reorderProjects(ids: string[]): void;

  upsertJournal(entry: JournalEntry): void;
  deleteJournal(date: string): void;
}

const nextOrder = (items: { order: number }[]) => Math.max(-1, ...items.map((i) => i.order)) + 1;

function without<T>(rec: Record<string, T>, drop: (item: T, id: string) => boolean): Record<string, T> {
  return Object.fromEntries(Object.entries(rec).filter(([k, v]) => !drop(v, k)));
}

function reorder<T extends { order: number }>(rec: Record<string, T>, ids: string[]): Record<string, T> {
  const out = { ...rec };
  ids.forEach((id, i) => {
    const item = out[id];
    if (item) out[id] = { ...item, order: i };
  });
  return out;
}

function mustGet<T>(rec: Record<string, T>, id: string, what: string): T {
  const item = rec[id];
  if (!item) throw new Error(`${what} ${id} not found`);
  return item;
}

export const useTracker = create<TrackerState>()((set, get) => {
  // Every write goes through here so data stays an immutable snapshot.
  const write = (fn: (d: TrackerData) => Partial<TrackerData>) =>
    set((s) => ({ data: { ...s.data, ...fn(s.data) } }));

  return {
    data: createSeed(),
    saveError: null,

    replaceAll: (data) => set({ data: TrackerData.parse(data) }),
    resetToSeed: () => set({ data: createSeed() }),
    updateSettings: (patch) => write((d) => ({ settings: Settings.parse({ ...d.settings, ...patch }) })),

    addPhase: (input) => {
      const id = newId();
      write((d) => ({
        phases: {
          ...d.phases,
          [id]: Phase.parse({
            title: 'New phase', weekRange: '', goal: '', kind: 'main', ...input,
            id, order: nextOrder(Object.values(d.phases)),
          }),
        },
      }));
      return id;
    },
    updatePhase: (id, patch) =>
      write((d) => ({ phases: { ...d.phases, [id]: Phase.parse({ ...mustGet(d.phases, id, 'Phase'), ...patch, id }) } })),
    deletePhase: (id) =>
      write((d) => {
        const weekIds = new Set(Object.values(d.weeks).filter((w) => w.phaseId === id).map((w) => w.id));
        const taskIds = new Set(Object.values(d.tasks).filter((t) => weekIds.has(t.weekId)).map((t) => t.id));
        return {
          phases: without(d.phases, (_, k) => k === id),
          weeks: without(d.weeks, (w) => w.phaseId === id),
          tasks: without(d.tasks, (t) => taskIds.has(t.id)),
          timeLogs: without(d.timeLogs, (l) => taskIds.has(l.taskId)),
          projects: without(d.projects, (p) => p.phaseId === id),
        };
      }),
    reorderPhases: (ids) => write((d) => ({ phases: reorder(d.phases, ids) })),

    addWeek: (phaseId, input = {}) => {
      mustGet(get().data.phases, phaseId, 'Phase');
      const id = newId();
      write((d) => ({
        weeks: {
          ...d.weeks,
          [id]: Week.parse({
            title: 'New week', weekNumber: null, status: 'not_started', ...input,
            id, phaseId, order: nextOrder(Object.values(d.weeks).filter((w) => w.phaseId === phaseId)),
          }),
        },
      }));
      return id;
    },
    updateWeek: (id, patch) =>
      write((d) => ({ weeks: { ...d.weeks, [id]: Week.parse({ ...mustGet(d.weeks, id, 'Week'), ...patch, id }) } })),
    deleteWeek: (id) =>
      write((d) => {
        const taskIds = new Set(Object.values(d.tasks).filter((t) => t.weekId === id).map((t) => t.id));
        return {
          weeks: without(d.weeks, (_, k) => k === id),
          tasks: without(d.tasks, (t) => t.weekId === id),
          timeLogs: without(d.timeLogs, (l) => taskIds.has(l.taskId)),
        };
      }),
    reorderWeeks: (ids) => write((d) => ({ weeks: reorder(d.weeks, ids) })),
    markWeekDone: (id) =>
      write((d) => ({
        weeks: { ...d.weeks, [id]: { ...mustGet(d.weeks, id, 'Week'), status: 'done' } },
        tasks: Object.fromEntries(
          Object.entries(d.tasks).map(([k, t]) => [k, t.weekId === id ? { ...t, status: 'done' as const } : t]),
        ),
      })),

    addTask: (weekId, input) => {
      mustGet(get().data.weeks, weekId, 'Week');
      const id = newId();
      write((d) => ({
        tasks: {
          ...d.tasks,
          [id]: Task.parse({
            notes: '', type: 'learn', status: 'not_started', priority: 'medium', dueDate: null,
            estimatedHours: 1, tags: [], resources: [], ...input,
            id, weekId, order: nextOrder(Object.values(d.tasks).filter((t) => t.weekId === weekId)),
          }),
        },
      }));
      return id;
    },
    updateTask: (id, patch) =>
      write((d) => ({ tasks: { ...d.tasks, [id]: Task.parse({ ...mustGet(d.tasks, id, 'Task'), ...patch, id }) } })),
    deleteTask: (id) =>
      write((d) => ({
        tasks: without(d.tasks, (_, k) => k === id),
        timeLogs: without(d.timeLogs, (l) => l.taskId === id),
      })),
    moveTask: (id, weekId, orderedIds) =>
      write((d) => {
        mustGet(d.weeks, weekId, 'Week');
        const tasks = { ...d.tasks, [id]: { ...mustGet(d.tasks, id, 'Task'), weekId } };
        return { tasks: reorder(tasks, orderedIds) };
      }),

    logHours: (taskId, date, hours) => {
      mustGet(get().data.tasks, taskId, 'Task');
      const id = newId();
      write((d) => ({ timeLogs: { ...d.timeLogs, [id]: TimeLog.parse({ id, taskId, date, hours }) } }));
      return id;
    },
    deleteTimeLog: (id) => write((d) => ({ timeLogs: without(d.timeLogs, (_, k) => k === id) })),

    addProject: (phaseId, input) => {
      mustGet(get().data.phases, phaseId, 'Phase');
      const id = newId();
      write((d) => ({
        projects: {
          ...d.projects,
          [id]: Project.parse({
            description: '', githubUrl: '', status: 'planned', evalResults: '', screenshots: [], ...input,
            id, phaseId, order: nextOrder(Object.values(d.projects)),
          }),
        },
      }));
      return id;
    },
    updateProject: (id, patch) =>
      write((d) => ({
        projects: { ...d.projects, [id]: Project.parse({ ...mustGet(d.projects, id, 'Project'), ...patch, id }) },
      })),
    deleteProject: (id) => write((d) => ({ projects: without(d.projects, (_, k) => k === id) })),
    reorderProjects: (ids) => write((d) => ({ projects: reorder(d.projects, ids) })),

    upsertJournal: (entry) => write((d) => ({ journal: { ...d.journal, [entry.date]: JournalEntry.parse(entry) } })),
    deleteJournal: (date) => write((d) => ({ journal: without(d.journal, (_, k) => k === date) })),
  };
});

/** Load from the repository (or seed on first run), then save on every change. */
export async function initTracker(repo: Repository): Promise<void> {
  const stored = await repo.load();
  if (stored) useTracker.setState({ data: stored });
  else await repo.save(useTracker.getState().data);

  let timer: ReturnType<typeof setTimeout> | undefined;
  useTracker.subscribe((s, prev) => {
    if (s.data === prev.data) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      repo.save(useTracker.getState().data).then(
        () => useTracker.getState().saveError && useTracker.setState({ saveError: null }),
        (err: unknown) => useTracker.setState({ saveError: err instanceof Error ? err.message : String(err) }),
      );
    }, 300);
  });
}
