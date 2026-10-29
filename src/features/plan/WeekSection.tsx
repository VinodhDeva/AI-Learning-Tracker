import { useState, type FormEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { Status, Task as TaskSchema, type Week } from '../../types/schema';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { InlineEdit } from '../../components/InlineEdit';
import { Sortable, SortableList } from '../../components/SortableList';
import { btn, btnDanger, field } from '../../components/ui';
import { STATUS_LABEL } from '../../lib/labels';
import { weekEnd, weekStart } from '../../lib/dates';
import { percentDone } from '../../lib/progress';
import { ExpandButton } from './bits';
import { ProgressBar } from '../../components/ProgressBar';
import { TaskRow } from './TaskRow';
import type { PlanIndex } from './PhaseSection';

const short = (iso: string) => format(parseISO(iso), 'MMM d');

export function WeekSection({ week, index }: { week: Week; index: PlanIndex }) {
  const { updateWeek, deleteWeek, markWeekDone, updateTask, moveTask } = useTracker.getState();
  const isCurrent = week.weekNumber === index.currentWeek;
  const open = useUi((s) => s.expanded[week.id] ?? isCurrent);
  const { setExpanded, showToast } = useUi.getState();

  const tasks = index.tasksByWeek.get(week.id) ?? [];
  const bodyId = `week-${week.id}`;
  const label = week.weekNumber ? `Week ${week.weekNumber}: ${week.title}` : week.title;
  const { startDate } = index.settings;

  const onMarkDone = () => {
    const prevWeek = week.status;
    const prevTasks = tasks.map((t) => [t.id, t.status] as const);
    markWeekDone(week.id);
    showToast({
      message: `${label} marked done`,
      action: {
        label: 'Undo',
        run: () => {
          const { data } = useTracker.getState();
          if (data.weeks[week.id]) updateWeek(week.id, { status: prevWeek });
          for (const [id, status] of prevTasks) if (data.tasks[id]) updateTask(id, { status });
        },
      },
    });
  };
  const onDelete = () => {
    if (confirm(`Delete "${label}" and its ${tasks.length} tasks?`)) deleteWeek(week.id);
  };

  return (
    <Sortable id={week.id} label={label}>
      {(handle) => (
        <section
          aria-label={label}
          aria-current={isCurrent ? 'date' : undefined}
          className={`rounded-lg border bg-canvas/40 ${isCurrent ? 'border-accent ring-1 ring-accent' : 'border-line'}`}
        >
          <header className="flex flex-wrap items-center gap-x-2 gap-y-1 p-2">
            <div className="flex items-center">
              {handle}
              <ExpandButton open={open} controls={bodyId} label={label} onToggle={() => setExpanded(week.id, !open)} />
            </div>
            {week.weekNumber !== null && (
              <span className="text-sm font-medium text-muted">
                Wk{' '}
                <InlineEdit
                  label="Week number"
                  value={String(week.weekNumber)}
                  onSave={(v) => updateWeek(week.id, { weekNumber: Number(v) })}
                  className="w-10 tabular-nums"
                />
              </span>
            )}
            <h3 className="min-w-48 flex-1 font-medium">
              <InlineEdit label="Week title" value={week.title} onSave={(title) => updateWeek(week.id, { title })} />
              {isCurrent && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs text-on-accent">Current</span>}
            </h3>
            {week.weekNumber !== null && (
              <span className="text-xs text-muted">
                {short(weekStart(startDate, week.weekNumber))} – {short(weekEnd(startDate, week.weekNumber))}
              </span>
            )}
            <select
              aria-label={`Status of ${label}`}
              className={field}
              value={week.status}
              onChange={(e) => updateWeek(week.id, { status: Status.parse(e.target.value) })}
            >
              {Status.options.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <button className={btn} onClick={onMarkDone} disabled={week.status === 'done' && tasks.every((t) => t.status === 'done')}>
              ✓ Mark week done
            </button>
            <button className={btnDanger} onClick={onDelete} aria-label={`Delete ${label}`}>✕</button>
            <div className="w-full pl-14">
              <ProgressBar pct={percentDone(tasks)} label={`${label} progress`} />
            </div>
          </header>

          {open && (
            <div id={bodyId} className="border-t border-line px-2 py-2">
              <SortableList ids={tasks.map((t) => t.id)} onReorder={(ids) => ids[0] && moveTask(ids[0], week.id, ids)}>
                <ul aria-label={`Tasks in ${label}`}>
                  {tasks.map((t) => (
                    <TaskRow key={t.id} task={t} week={week} index={index} />
                  ))}
                </ul>
              </SortableList>
              <AddTask weekId={week.id} />
            </div>
          )}
        </section>
      )}
    </Sortable>
  );
}

function AddTask({ weekId }: { weekId: string }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const addTask = useTracker((s) => s.addTask);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = TaskSchema.shape.title.safeParse(title);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Invalid title');
    addTask(weekId, { title: parsed.data });
    setTitle('');
    setError(null);
  };

  return (
    <form onSubmit={onSubmit} className="mt-1 flex gap-2 pl-7">
      <input
        className={`${field} flex-1`}
        placeholder="Add a task and press Enter"
        aria-label="New task title"
        aria-invalid={error ? true : undefined}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button className={btn} type="submit">Add</button>
      {error && <span role="alert" className="self-center text-xs text-danger">{error}</span>}
    </form>
  );
}
