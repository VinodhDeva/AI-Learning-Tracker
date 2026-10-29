import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { IsoDate, Settings } from '../../types/schema';
import { useTracker } from '../../store/useTracker';
import { useUi, type Theme } from '../../store/useUi';
import { DraftInput } from '../../components/DraftInput';
import { btn, btnPrimary, field } from '../../components/ui';
import { exportJson, parseBackup } from '../../lib/backup';
import { todayIso, weekEnd, weekStart } from '../../lib/dates';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Match system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
const pretty = (iso: string) => format(parseISO(iso), 'EEE, MMM d, yyyy');

export function SettingsPage() {
  const data = useTracker((s) => s.data);
  const { updateSettings, replaceAll, resetToSeed } = useTracker.getState();
  const { theme, setTheme, showToast } = useUi();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const { startDate, weeklyHourTarget } = data.settings;

  /** Run a destructive change with a 6s undo that restores the previous snapshot. */
  const withUndo = (message: string, change: () => void) => {
    const previous = useTracker.getState().data;
    change();
    showToast({ message, action: { label: 'Undo', run: () => replaceAll(previous) } });
  };

  const onExport = () => {
    const url = URL.createObjectURL(new Blob([exportJson(data)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-tracker-backup-${todayIso()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url));
  };

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = parseBackup(await file.text());
    if (!result.ok) return setImportError(result.error);
    setImportError(null);
    const tasks = Object.keys(result.data.tasks).length;
    if (!confirm(`Replace all current data with "${file.name}" (${tasks} tasks)? Export a backup first if unsure.`)) return;
    withUndo(`Imported ${file.name}`, () => replaceAll(result.data));
  };

  const onReset = () => {
    if (!confirm('Reset everything to the original 16-week plan? All tasks, hours, journal entries and projects will be replaced.')) return;
    withUndo('Reset to the seed plan', resetToSeed);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Section title="Plan">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Weekly hour target
            <DraftInput
              label="Weekly hour target"
              type="number"
              value={String(weeklyHourTarget)}
              onChange={(v) => updateSettings({ weeklyHourTarget: Settings.shape.weeklyHourTarget.parse(Number(v)) })}
            />
            <span className="text-xs font-normal text-muted">Between 1 and 80 hours.</span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Start date
            <input
              type="date"
              className={field}
              value={startDate}
              onChange={(e) => IsoDate.safeParse(e.target.value).success && updateSettings({ startDate: e.target.value })}
            />
            <span className="text-xs font-normal text-muted">
              Week 1: {pretty(weekStart(startDate, 1))} – {pretty(weekEnd(startDate, 1))}. Week 16 ends {pretty(weekEnd(startDate, 16))}.
              Tasks without their own due date are due at the end of their week.
            </span>
          </label>
        </div>
      </Section>

      <Section title="Appearance">
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className="sr-only">Theme</legend>
          {THEMES.map((t) => (
            <label key={t.value} className="flex items-center gap-2">
              <input type="radio" name="theme" className="accent-accent" checked={theme === t.value} onChange={() => setTheme(t.value)} />
              {t.label}
            </label>
          ))}
        </fieldset>
      </Section>

      <Section title="Backup and restore">
        <p className="mb-3 text-sm text-muted">
          Your data lives only in this browser. Export a JSON backup regularly, and before clearing site data or switching browsers.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={onExport}>Export JSON</button>
          <button className={btn} onClick={() => fileInput.current?.click()}>Import JSON…</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onImport} aria-label="Import backup file" />
        </div>
        {importError && <p role="alert" className="mt-2 text-sm text-danger">{importError}</p>}
      </Section>

      <Section title="Danger zone">
        <p className="mb-3 text-sm text-muted">Replace all data with the original seed plan. You get a few seconds to undo.</p>
        <button className={`${btn} border-danger text-danger hover:bg-danger/10`} onClick={onReset}>
          Reset to seed data
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}
