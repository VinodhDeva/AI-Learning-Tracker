import type { Priority, ResourceKind, Status, TaskType } from '../types/schema';

export const STATUS_LABEL: Record<Status, string> = { not_started: 'Not started', in_progress: 'In progress', done: 'Done' };
export const TYPE_LABEL: Record<TaskType, string> = { learn: 'Learn', build: 'Build', practice: 'Practice', review: 'Review' };
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };
export const KIND_LABEL: Record<ResourceKind, string> = { video: 'Video', course: 'Course', article: 'Article', repo: 'Repo', book: 'Book' };

// Earthy hues to sit with the cream/forest theme; the badge text names the type, so color is never the only cue.
export const TYPE_COLOR: Record<TaskType, string> = {
  learn: 'bg-[#dce5ea] text-[#2f4a5a] dark:bg-[#2f4a5a]/50 dark:text-[#cfdde6]',
  build: 'bg-[#f0e0c8] text-[#6b4a1f] dark:bg-[#6b4a1f]/50 dark:text-[#f0dcc0]',
  practice: 'bg-botanical text-accent dark:text-ink',
  review: 'bg-[#e9dce1] text-[#5e3a4a] dark:bg-[#5e3a4a]/50 dark:text-[#ead6de]',
};
