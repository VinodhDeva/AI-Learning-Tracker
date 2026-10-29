import { TrackerData } from '../types/schema';

export const exportJson = (data: TrackerData) => JSON.stringify(data, null, 2);

export type ImportResult = { ok: true; data: TrackerData } | { ok: false; error: string };

/** Parse and validate a backup file. Never throws. */
export function parseBackup(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  const parsed = TrackerData.safeParse(json);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issue = parsed.error.issues[0];
  return { ok: false, error: `Invalid backup at "${issue?.path.join('.') || '(root)'}": ${issue?.message}` };
}
