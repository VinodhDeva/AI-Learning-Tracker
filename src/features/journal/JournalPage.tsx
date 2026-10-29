import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IsoDate, type JournalEntry } from '../../types/schema';
import { useTracker } from '../../store/useTracker';
import { btn, btnDanger, field } from '../../components/ui';
import { todayIso } from '../../lib/dates';
import { hoursByDay, studyDays } from '../../lib/progress';
import { heatmapWeeks } from '../../lib/heatmap';
import { Heatmap } from './Heatmap';

type Field = Exclude<keyof JournalEntry, 'date'>;
const FIELDS: { key: Field; label: string; placeholder: string }[] = [
  { key: 'whatILearned', label: 'What I learned', placeholder: 'Key ideas, aha moments, things that clicked…' },
  { key: 'blockers', label: 'Blockers', placeholder: 'What got in the way or is still confusing?' },
  { key: 'nextSteps', label: 'Next steps', placeholder: 'What to do next session' },
];
const pretty = (iso: string) => format(parseISO(iso), 'EEEE, MMM d, yyyy');

export function JournalPage() {
  const data = useTracker((s) => s.data);
  const today = todayIso();
  const [date, setDate] = useState(today);

  const hours = useMemo(() => hoursByDay(data), [data]);
  const weeks = useMemo(
    () => heatmapWeeks(data.settings.startDate, today, hours, new Set(Object.keys(data.journal))),
    [data.settings.startDate, data.journal, hours, today],
  );
  const totalHours = [...hours.values()].reduce((a, b) => a + b, 0);
  const entries = Object.values(data.journal).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Journal</h1>

      <section aria-label="Study calendar" className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Study days</h2>
          <span className="text-sm text-muted">
            {studyDays(data).size} study days · {Math.round(totalHours * 10) / 10}h logged
          </span>
        </div>
        <Heatmap weeks={weeks} today={today} selected={date} onSelect={setDate} />
      </section>

      <EntryForm key={date} date={date} hours={hours.get(date) ?? 0} onDateChange={setDate} today={today} />

      <section aria-label="Past entries" className="space-y-3">
        <h2 className="font-semibold">Entries ({entries.length})</h2>
        {entries.length === 0 && <p className="text-sm italic text-muted">No entries yet. Write one above.</p>}
        {entries.map((e) => (
          <PastEntry key={e.date} entry={e} hours={hours.get(e.date) ?? 0} onEdit={() => setDate(e.date)} />
        ))}
      </section>
    </div>
  );
}

function EntryForm({ date, hours, today, onDateChange }: { date: string; hours: number; today: string; onDateChange(d: string): void }) {
  const entry = useTracker((s) => s.data.journal[date]);
  const { upsertJournal, deleteJournal } = useTracker.getState();
  const current: JournalEntry = entry ?? { date, whatILearned: '', blockers: '', nextSteps: '' };

  // An all-empty entry is removed, so it never counts as a study day.
  const onChange = (key: Field, value: string) => {
    const next = { ...current, [key]: value };
    if (FIELDS.every((f) => !next[f.key].trim())) {
      if (entry) deleteJournal(date);
    } else {
      upsertJournal(next);
    }
  };

  return (
    <section aria-label="Journal entry" className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex-1 font-semibold">{pretty(date)}</h2>
        <span className="text-sm text-muted">{hours}h logged</span>
        <input
          type="date"
          className={field}
          aria-label="Entry date"
          value={date}
          max={today}
          onChange={(e) => IsoDate.safeParse(e.target.value).success && onDateChange(e.target.value)}
        />
        {date !== today && <button className={btn} onClick={() => onDateChange(today)}>Today</button>}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-xs font-medium text-muted">
            {f.label}
            <textarea
              className={`${field} min-h-32 text-ink`}
              placeholder={f.placeholder}
              maxLength={f.key === 'whatILearned' ? 10000 : 5000}
              value={current[f.key]}
              onChange={(e) => onChange(f.key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">Saves as you type.</p>
    </section>
  );
}

function PastEntry({ entry, hours, onEdit }: { entry: JournalEntry; hours: number; onEdit(): void }) {
  const deleteJournal = useTracker((s) => s.deleteJournal);
  return (
    <article aria-label={`Entry for ${pretty(entry.date)}`} className="rounded-xl border border-line bg-surface p-4">
      <header className="mb-2 flex items-center gap-2">
        <h3 className="flex-1 font-medium">{pretty(entry.date)}</h3>
        {hours > 0 && <span className="text-xs text-muted">{hours}h</span>}
        <button className={btn} onClick={onEdit}>Edit</button>
        <button
          className={btnDanger}
          aria-label={`Delete entry for ${entry.date}`}
          onClick={() => confirm(`Delete the journal entry for ${pretty(entry.date)}?`) && deleteJournal(entry.date)}
        >
          ✕
        </button>
      </header>
      <dl className="grid gap-3 text-sm md:grid-cols-3">
        {FIELDS.filter((f) => entry[f.key].trim()).map((f) => (
          <div key={f.key}>
            <dt className="text-xs font-medium text-muted">{f.label}</dt>
            <dd className="whitespace-pre-wrap">{entry[f.key]}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
