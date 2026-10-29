import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NO_FILTERS, type TaskFilters } from '../lib/filter';
import type { WeeklyReview } from '../lib/ai';

export type Theme = 'system' | 'light' | 'dark';
export interface Toast {
  message: string;
  action?: { label: string; run: () => void };
}

interface UiState {
  theme: Theme;
  /** Explicit expand/collapse choices; ids without an entry use the view's default. */
  expanded: Record<string, boolean>;
  openTaskId: string | null;
  toast: Toast | null;
  filters: TaskFilters;
  /** Set by the / shortcut; the search box focuses itself and clears it once mounted. */
  focusSearch: boolean;
  /** Last AI weekly review, so it survives navigation and reloads. */
  lastReview: { weekId: string; at: string; review: WeeklyReview } | null;
  setTheme(theme: Theme): void;
  setExpanded(id: string, open: boolean): void;
  openTask(id: string | null): void;
  showToast(toast: Toast | null): void;
  setFilters(patch: Partial<TaskFilters>): void;
  setFocusSearch(focusSearch: boolean): void;
  setLastReview(lastReview: UiState['lastReview']): void;
}

// Per-browser view preferences only; tracker data lives in useTracker.
export const useUi = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      expanded: {},
      openTaskId: null,
      toast: null,
      filters: NO_FILTERS,
      focusSearch: false,
      lastReview: null,
      setTheme: (theme) => set({ theme }),
      setExpanded: (id, open) => set((s) => ({ expanded: { ...s.expanded, [id]: open } })),
      openTask: (openTaskId) => set({ openTaskId }),
      showToast: (toast) => set({ toast }),
      setFocusSearch: (focusSearch) => set({ focusSearch }),
      setLastReview: (lastReview) => set({ lastReview }),
      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
    }),
    { name: 'ai-tracker:ui', partialize: (s) => ({ theme: s.theme, expanded: s.expanded, lastReview: s.lastReview }) },
  ),
);
