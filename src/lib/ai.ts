import { z } from 'zod';
import { IsoDate, Priority, TaskType } from '../types/schema';

// Responses are validated again here: the server is a trust boundary for the browser too.
export const ParsedTask = z.object({
  title: z.string().trim().min(1).max(200),
  type: TaskType,
  priority: Priority,
  dueDate: IsoDate.nullable(),
  estimatedHours: z.number().min(0).max(200),
  tags: z.array(z.string().trim().min(1).max(30)).max(10),
  notes: z.string().max(2000),
});
export type ParsedTask = z.infer<typeof ParsedTask>;

export const Subtasks = z.object({
  subtasks: z.array(z.object({ title: z.string().trim().min(1).max(200), type: TaskType, estimatedHours: z.number().min(0).max(200) })).min(1),
});
export type Subtask = z.infer<typeof Subtasks>['subtasks'][number];

export const WeeklyReview = z.object({
  summary: z.string(),
  wins: z.array(z.string()),
  blockers: z.array(z.string()),
  nextWeekFocus: z.array(z.string()),
});
export type WeeklyReview = z.infer<typeof WeeklyReview>;

export interface WeeklyReviewInput {
  week: { label: string; done: string[]; open: string[] };
  nextWeek: { label: string; done: string[]; open: string[] } | null;
  hoursLogged: number;
  hourTarget: number;
  journal: { date: string; whatILearned: string; blockers: string; nextSteps: string }[];
}

async function post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/ai/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('AI server is not reachable. Start it with: cd server && uv run uvicorn app.main:app --port 8787');
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = (json as { detail?: unknown } | null)?.detail;
    if (res.status === 404 || (res.status >= 500 && !detail)) {
      throw new Error('AI server is not running. Start it with: cd server && uv run uvicorn app.main:app --port 8787');
    }
    throw new Error(typeof detail === 'string' ? detail : `AI request failed (${res.status})`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new Error('AI server returned an unexpected response.');
  return parsed.data;
}

export const aiParseTask = (text: string, today: string) => post('parse-task', { text, today }, ParsedTask);

export const aiSubtasks = (t: { title: string; notes: string; type: string; estimatedHours: number }) =>
  post('subtasks', { title: t.title, notes: t.notes.slice(0, 5000), type: t.type, estimatedHours: t.estimatedHours }, Subtasks).then(
    (r) => r.subtasks,
  );

export const aiWeeklyReview = (input: WeeklyReviewInput) => post('weekly-review', input, WeeklyReview);
