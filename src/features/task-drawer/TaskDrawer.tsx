import { Suspense, lazy, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { Priority, Resource, ResourceKind, Status, TaskType, TimeLog, type Task } from '../../types/schema';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { DraftInput } from '../../components/DraftInput';
import { SubtasksButton } from '../ai/SubtasksButton';
import { btn, btnDanger, btnPrimary, field } from '../../components/ui';
import { KIND_LABEL, PRIORITY_LABEL, STATUS_LABEL, TYPE_LABEL } from '../../lib/labels';
import { effectiveDueDate, todayIso } from '../../lib/dates';
import { byOrder } from '../../lib/select';
import { newId } from '../../lib/id';

// react-markdown is the heaviest dependency; load it only when notes are previewed.
const Markdown = lazy(() => import('../../components/Markdown').then((m) => ({ default: m.Markdown })));

export function TaskDrawer() {
  const openTaskId = useUi((s) => s.openTaskId);
  const openTask = useUi((s) => s.openTask);
  const task = useTracker((s) => (openTaskId ? s.data.tasks[openTaskId] : undefined));
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (task && !d.open) d.showModal();
    if (!task && d.open) d.close();
  }, [task]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="task-drawer-title"
      onClose={() => openTask(null)}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40"
    >
      {task && <TaskDetail key={task.id} task={task} onClose={() => ref.current?.close()} />}
    </dialog>
  );
}

// Fields save on every valid change, so closing with Escape never loses edits.
function TaskDetail({ task, onClose }: { task: Task; onClose(): void }) {
  const { updateTask, deleteTask, moveTask } = useTracker.getState();
  const update = (patch: Partial<Task>) => updateTask(task.id, patch);
  const phases = useTracker((s) => s.data.phases);
  const weeks = useTracker((s) => s.data.weeks);
  const tasks = useTracker((s) => s.data.tasks);
  const settings = useTracker((s) => s.data.settings);
  const week = weeks[task.weekId];
  const defaultDue = effectiveDueDate({ ...task, dueDate: null }, week, settings);

  const onMove = (weekId: string) => {
    const ids = byOrder(Object.values(tasks).filter((t) => t.weekId === weekId)).map((t) => t.id);
    moveTask(task.id, weekId, [...ids, task.id]);
  };
  const onDelete = () => {
    if (confirm(`Delete task "${task.title}"?`)) {
      onClose();
      deleteTask(task.id);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-2 border-b border-line p-4">
        <div className="flex-1">
          <span className="text-xs uppercase tracking-wide text-muted">
            {week ? (week.weekNumber ? `Week ${week.weekNumber} · ${week.title}` : week.title) : ''}
          </span>
          <h2 id="task-drawer-title" className="sr-only">{task.title}</h2>
          <DraftInput
            label="Task title"
            value={task.title}
            onChange={(title) => update({ title })}
            selectOnFocus
            className="w-full text-lg font-semibold"
          />
        </div>
        <button className={btn} onClick={onClose} aria-label="Close task details">✕</button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Labeled label="Status">
            <select className={field} value={task.status} onChange={(e) => update({ status: Status.parse(e.target.value) })}>
              {Status.options.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Labeled>
          <Labeled label="Type">
            <select className={field} value={task.type} onChange={(e) => update({ type: TaskType.parse(e.target.value) })}>
              {TaskType.options.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </Labeled>
          <Labeled label="Priority">
            <select className={field} value={task.priority} onChange={(e) => update({ priority: Priority.parse(e.target.value) })}>
              {Priority.options.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </Labeled>
          <Labeled label="Due date" hint={defaultDue && !task.dueDate ? `Defaults to week end, ${format(parseISO(defaultDue), 'MMM d')}` : undefined}>
            <span className="flex gap-1">
              <input
                type="date"
                className={`${field} min-w-0 flex-1`}
                value={task.dueDate ?? ''}
                onChange={(e) => update({ dueDate: e.target.value || null })}
              />
              {task.dueDate && (
                <button className={btn} onClick={() => update({ dueDate: null })} aria-label="Clear due date">✕</button>
              )}
            </span>
          </Labeled>
          <Labeled label="Estimated hours">
            <DraftInput
              label="Estimated hours"
              type="number"
              value={String(task.estimatedHours)}
              onChange={(v) => update({ estimatedHours: v === '' ? NaN : Number(v) })}
            />
          </Labeled>
          <Labeled label="Week">
            <select className={field} value={task.weekId} onChange={(e) => onMove(e.target.value)}>
              {byOrder(Object.values(phases)).map((p) => (
                <optgroup key={p.id} label={p.title}>
                  {byOrder(Object.values(weeks).filter((w) => w.phaseId === p.id)).map((w) => (
                    <option key={w.id} value={w.id}>{w.weekNumber ? `Wk ${w.weekNumber}: ${w.title}` : w.title}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Labeled>
        </div>

        <Tags tags={task.tags} onChange={(tags) => update({ tags })} />
        <Notes notes={task.notes} onChange={(notes) => update({ notes })} />
        <SubtasksButton task={task} />
        <Resources task={task} onChange={(resources) => update({ resources })} />
        <HoursLogger task={task} />

        <button className="text-sm text-danger hover:underline" onClick={onDelete}>Delete task</button>
      </div>
    </div>
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted">
      {label}
      {children}
      {hint && <span className="font-normal text-muted">{hint}</span>}
    </label>
  );
}

function Tags({ tags, onChange }: { tags: string[]; onChange(tags: string[]): void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const tag = draft.trim().replace(/,$/, '').slice(0, 30);
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setDraft('');
  };
  return (
    <section aria-labelledby="tags-h">
      <h3 id="tags-h" className="mb-1 text-sm font-semibold">Tags</h3>
      <div className="flex flex-wrap items-center gap-1">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-tint/50 px-2 py-0.5 text-xs">
            {t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`} className="text-muted hover:text-danger">×</button>
          </span>
        ))}
        <input
          className={`${field} w-32`}
          placeholder="Add tag"
          aria-label="Add tag"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
      </div>
    </section>
  );
}

function Notes({ notes, onChange }: { notes: string; onChange(notes: string): void }) {
  const [preview, setPreview] = useState(notes.length > 0);
  return (
    <section aria-labelledby="notes-h">
      <div className="mb-1 flex items-center gap-2">
        <h3 id="notes-h" className="text-sm font-semibold">Notes</h3>
        <div role="group" aria-label="Notes mode" className="ml-auto flex text-xs">
          {(['Edit', 'Preview'] as const).map((m) => (
            <button
              key={m}
              aria-pressed={(m === 'Preview') === preview}
              onClick={() => setPreview(m === 'Preview')}
              className="rounded px-2 py-0.5 aria-pressed:bg-tint"
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      {preview ? (
        <div className="min-h-16 rounded-md border border-line p-2">
          {notes ? <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}><Markdown>{notes}</Markdown></Suspense> : <p className="text-sm italic text-muted">No notes yet.</p>}
        </div>
      ) : (
        <textarea
          aria-label="Notes (markdown)"
          className={`${field} min-h-40 w-full font-mono`}
          maxLength={20000}
          placeholder="Markdown supported"
          value={notes}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </section>
  );
}

function Resources({ task, onChange }: { task: Task; onChange(r: Task['resources']): void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [kind, setKind] = useState<ResourceKind>('article');
  const [error, setError] = useState<string | null>(null);
  const done = task.resources.filter((r) => r.done).length;

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    const parsed = Resource.pick({ title: true, url: true, kind: true }).safeParse({ title, url: url.trim(), kind });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return setError(issue?.path[0] === 'url' ? 'Enter a full URL starting with https://' : 'Title is required');
    }
    onChange([...task.resources, { ...parsed.data, id: newId(), done: false }]);
    setTitle('');
    setUrl('');
    setError(null);
  };

  return (
    <section aria-labelledby="res-h">
      <h3 id="res-h" className="mb-1 text-sm font-semibold">
        Resources <span className="font-normal text-muted">{done}/{task.resources.length}</span>
      </h3>
      <ul className="space-y-1">
        {task.resources.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-accent"
              checked={r.done}
              aria-label={`Mark resource "${r.title}" ${r.done ? 'not done' : 'done'}`}
              onChange={() => onChange(task.resources.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x)))}
            />
            <span className="rounded bg-tint/50 px-1.5 text-xs">{KIND_LABEL[r.kind]}</span>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer noopener" className={`flex-1 truncate text-accent hover:underline ${r.done ? 'line-through opacity-60' : ''}`}>
                {r.title}
              </a>
            ) : (
              <span className={`flex-1 truncate ${r.done ? 'line-through opacity-60' : ''}`}>{r.title}</span>
            )}
            <button className={btnDanger} onClick={() => onChange(task.resources.filter((x) => x.id !== r.id))} aria-label={`Remove resource ${r.title}`}>✕</button>
          </li>
        ))}
      </ul>
      <form onSubmit={onAdd} className="mt-2 flex flex-wrap gap-1">
        <input className={`${field} min-w-0 flex-1`} placeholder="Title" aria-label="Resource title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={`${field} min-w-0 flex-1`} placeholder="https://…" aria-label="Resource URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <select className={field} aria-label="Resource kind" value={kind} onChange={(e) => setKind(ResourceKind.parse(e.target.value))}>
          {ResourceKind.options.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        <button className={btn} type="submit">Add</button>
      </form>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </section>
  );
}

function HoursLogger({ task }: { task: Task }) {
  const allLogs = useTracker((s) => s.data.timeLogs);
  const { logHours, deleteTimeLog } = useTracker.getState();
  const logs = useMemo(
    () => Object.values(allLogs).filter((l) => l.taskId === task.id).sort((a, b) => b.date.localeCompare(a.date)),
    [allLogs, task.id],
  );
  const spent = logs.reduce((s, l) => s + l.hours, 0);
  const [date, setDate] = useState(todayIso());
  const [hours, setHours] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const onLog = (e: FormEvent) => {
    e.preventDefault();
    const parsed = TimeLog.pick({ date: true, hours: true }).safeParse({ date, hours: Number(hours) });
    if (!parsed.success) return setError('Enter a date and 0–24 hours');
    logHours(task.id, parsed.data.date, parsed.data.hours);
    setError(null);
  };

  return (
    <section aria-labelledby="hours-h">
      <h3 id="hours-h" className="mb-1 text-sm font-semibold">
        Hours <span className="font-normal text-muted">{spent} spent / {task.estimatedHours} estimated</span>
      </h3>
      <form onSubmit={onLog} className="flex flex-wrap gap-1">
        <input type="date" className={field} aria-label="Date worked" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="number" step={0.25} min={0.25} max={24} className={`${field} w-20`} aria-label="Hours worked" value={hours} onChange={(e) => setHours(e.target.value)} />
        <button className={btnPrimary} type="submit">Log hours</button>
      </form>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
      {logs.length > 0 && (
        <ul className="mt-2 divide-y divide-line text-sm">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center gap-2 py-1">
              <span className="flex-1">{format(parseISO(l.date), 'EEE, MMM d')}</span>
              <span className="tabular-nums">{l.hours}h</span>
              <button className={btnDanger} onClick={() => deleteTimeLog(l.id)} aria-label={`Delete ${l.hours}h logged on ${l.date}`}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
