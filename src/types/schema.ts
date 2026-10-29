import { z } from 'zod';

// Single source of truth: forms, JSON import and AI output are all validated against these.

export const Status = z.enum(['not_started', 'in_progress', 'done']);
export const TaskType = z.enum(['learn', 'build', 'practice', 'review']);
export const Priority = z.enum(['low', 'medium', 'high']);
export const ResourceKind = z.enum(['video', 'course', 'article', 'repo', 'book']);
export const ProjectStatus = z.enum(['planned', 'in_progress', 'shipped']);

const id = z.string().min(1);
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const optionalUrl = z.url().or(z.literal(''));

export const Phase = z.object({
  id,
  title: z.string().trim().min(1).max(120),
  weekRange: z.string().max(40),
  goal: z.string().max(1000),
  order: z.number().int(),
  kind: z.enum(['main', 'side']),
});

export const Week = z.object({
  id,
  phaseId: id,
  weekNumber: z.number().int().min(1).max(52).nullable(), // null for side-track lists
  title: z.string().trim().min(1).max(200),
  status: Status,
  order: z.number().int(),
});

export const Resource = z.object({
  id,
  title: z.string().trim().min(1).max(200),
  url: optionalUrl,
  kind: ResourceKind,
  done: z.boolean(),
});

export const Task = z.object({
  id,
  weekId: id,
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(20000),
  type: TaskType,
  status: Status,
  priority: Priority,
  dueDate: IsoDate.nullable(), // null = week end date
  estimatedHours: z.number().min(0).max(200),
  tags: z.array(z.string().trim().min(1).max(30)),
  resources: z.array(Resource),
  order: z.number().int(),
});

export const TimeLog = z.object({
  id,
  taskId: id,
  date: IsoDate,
  hours: z.number().positive().max(24),
});

export const Project = z.object({
  id,
  phaseId: id,
  name: z.string().trim().min(1).max(120),
  description: z.string().max(5000),
  githubUrl: optionalUrl,
  status: ProjectStatus,
  evalResults: z.string().max(50000),
  screenshots: z.array(z.string()), // downscaled data URLs
  order: z.number().int(),
});

export const JournalEntry = z.object({
  date: IsoDate,
  whatILearned: z.string().max(10000),
  blockers: z.string().max(5000),
  nextSteps: z.string().max(5000),
});

export const Settings = z.object({
  weeklyHourTarget: z.number().min(1).max(80),
  startDate: IsoDate,
});

export const TrackerData = z.object({
  version: z.literal(1),
  phases: z.record(z.string(), Phase),
  weeks: z.record(z.string(), Week),
  tasks: z.record(z.string(), Task),
  timeLogs: z.record(z.string(), TimeLog),
  projects: z.record(z.string(), Project),
  journal: z.record(z.string(), JournalEntry), // keyed by date
  settings: Settings,
});

export type Status = z.infer<typeof Status>;
export type TaskType = z.infer<typeof TaskType>;
export type Priority = z.infer<typeof Priority>;
export type ResourceKind = z.infer<typeof ResourceKind>;
export type ProjectStatus = z.infer<typeof ProjectStatus>;
export type Phase = z.infer<typeof Phase>;
export type Week = z.infer<typeof Week>;
export type Resource = z.infer<typeof Resource>;
export type Task = z.infer<typeof Task>;
export type TimeLog = z.infer<typeof TimeLog>;
export type Project = z.infer<typeof Project>;
export type JournalEntry = z.infer<typeof JournalEntry>;
export type Settings = z.infer<typeof Settings>;
export type TrackerData = z.infer<typeof TrackerData>;
