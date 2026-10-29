import { TrackerData } from '../types/schema';

/** Persistence boundary. Swap LocalStorageRepository for an API-backed one to move to FastAPI + Postgres. */
export interface Repository {
  load(): Promise<TrackerData | null>;
  save(data: TrackerData): Promise<void>;
}

export const STORAGE_KEY = 'ai-tracker:data';

export class LocalStorageRepository implements Repository {
  constructor(private key = STORAGE_KEY) {}

  async load(): Promise<TrackerData | null> {
    const raw = localStorage.getItem(this.key);
    if (!raw) return null;
    try {
      const parsed = TrackerData.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
      console.error('Stored data failed validation', parsed.error);
    } catch (err) {
      console.error('Stored data is not valid JSON', err);
    }
    // Keep the bad copy so a seed reset never silently destroys the user's data.
    localStorage.setItem(`${this.key}:corrupt:${Date.now()}`, raw);
    return null;
  }

  async save(data: TrackerData): Promise<void> {
    // Throws QuotaExceededError when full; callers surface it.
    localStorage.setItem(this.key, JSON.stringify(data));
  }
}

export const repository: Repository = new LocalStorageRepository();
