import type { Priority, ResourceKind, Status, TaskType } from '../types/schema';

export const STATUS_LABEL: Record<Status, string> = { not_started: 'Not started', in_progress: 'In progress', done: 'Done' };
export const TYPE_LABEL: Record<TaskType, string> = { learn: 'Learn', build: 'Build', practice: 'Practice', review: 'Review' };
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };
export const KIND_LABEL: Record<ResourceKind, string> = { video: 'Video', course: 'Course', article: 'Article', repo: 'Repo', book: 'Book' };

// Palette hues; the badge text names the type, so color is never the only cue.
export const TYPE_COLOR: Record<TaskType, string> = {
  learn: 'bg-tint text-accent dark:text-ink',
  build: 'bg-[#ffe1cc] text-[#8a4a1c] dark:bg-[#8a4a1c]/50 dark:text-[#ffe1cc]',
  practice: 'bg-teal/20 text-[#1c6f6b] dark:text-teal',
  review: 'bg-coral/20 text-[#9c2a4b] dark:text-danger',
};
