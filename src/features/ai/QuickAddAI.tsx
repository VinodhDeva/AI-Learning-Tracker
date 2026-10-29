import { useState, type FormEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { btn, btnPrimary, field } from '../../components/ui';
import { aiParseTask, type ParsedTask } from '../../lib/ai';
import { todayIso } from '../../lib/dates';
import { currentWeek, weekForDate } from '../../lib/progress';
import { byOrder } from '../../lib/select';
import { PRIORITY_LABEL, TYPE_COLOR, TYPE_LABEL } from '../../lib/labels';

/** "finish RAG chunking tutorial by Sunday, 3 hrs" -> a reviewed task draft -> added to the matching week. */
export function QuickAddAI() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<(ParsedTask & { weekId: string }) | null>(null);
  const weeks = useTracker((s) => s.data.weeks);
  const phases = useTracker((s) => s.data.phases);

  const onDraft = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const task = await aiParseTask(text.trim(), todayIso());
      const { data } = useTracker.getState();
      const week = (task.dueDate && weekForDate(data, task.dueDate)) || currentWeek(data) || byOrder(Object.values(data.weeks))[0];
      if (!week) throw new Error('Add a week to the plan first.');
      setDraft({ ...task, weekId: week.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onAdd = () => {
    if (!draft) return;
    const { weekId, ...task } = draft;
    const id = useTracker.getState().addTask(weekId, task);
    const week = useTracker.getState().data.weeks[weekId];
    useUi.getState().showToast({
      message: `Added "${task.title}" to ${week?.weekNumber ? `Week ${week.weekNumber}` : week?.title}`,
      action: { label: 'Open', run: () => useUi.getState().openTask(id) },
    });
    setDraft(null);
    setText('');
  };

  return (
    <section aria-label="Add a task with AI" className="rounded-xl border border-dashed border-sage bg-surface p-3">
      <form onSubmit={onDraft} className="flex flex-wrap gap-2">
        <input
          className={`${field} min-w-64 flex-1`}
          aria-label="Describe a task"
          placeholder="✨ Describe a task, e.g. finish RAG chunking tutorial by Sunday, 3 hrs"
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />
        <button className={btnPrimary} type="submit" disabled={busy || !text.trim()}>
          {busy ? 'Drafting…' : 'Draft task'}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}

      {draft && (
        <div aria-label="Task draft" role="group" className="mt-3 space-y-2 rounded-lg bg-canvas/60 p-3 text-sm">
          <input
            className={`${field} w-full font-medium`}
            aria-label="Draft title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className={`rounded px-1.5 ${TYPE_COLOR[draft.type]}`}>{TYPE_LABEL[draft.type]}</span>
            <span>{PRIORITY_LABEL[draft.priority]} priority</span>
            <span>· {draft.estimatedHours}h</span>
            <span>· {draft.dueDate ? `due ${format(parseISO(draft.dueDate), 'EEE, MMM d')}` : 'no due date'}</span>
            {draft.tags.map((t) => <span key={t} className="rounded-full bg-botanical/60 px-2 text-ink">{t}</span>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted">
              Week
              <select className={field} value={draft.weekId} onChange={(e) => setDraft({ ...draft, weekId: e.target.value })}>
                {byOrder(Object.values(phases)).map((p) => (
                  <optgroup key={p.id} label={p.title}>
                    {byOrder(Object.values(weeks).filter((w) => w.phaseId === p.id)).map((w) => (
                      <option key={w.id} value={w.id}>{w.weekNumber ? `Wk ${w.weekNumber}: ${w.title}` : w.title}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <span className="flex-1" />
            <button className={btn} onClick={() => setDraft(null)}>Discard</button>
            <button className={btnPrimary} onClick={onAdd} disabled={!draft.title.trim()}>Add task</button>
          </div>
        </div>
      )}
    </section>
  );
}
