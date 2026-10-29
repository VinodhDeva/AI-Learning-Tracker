import { format, parseISO } from 'date-fns';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { effectiveDueDate, isOverdue } from '../../lib/dates';
import { filterTasks } from '../../lib/filter';
import { STATUS_LABEL, TYPE_COLOR, TYPE_LABEL } from '../../lib/labels';

/** Flat list of tasks matching the current filters, in plan order. */
export function SearchResults() {
  const data = useTracker((s) => s.data);
  const updateTask = useTracker((s) => s.updateTask);
  const filters = useUi((s) => s.filters);
  const openTask = useUi((s) => s.openTask);

  const rank = (weekId: string) => {
    const w = data.weeks[weekId];
    return [data.phases[w?.phaseId ?? '']?.order ?? 0, w?.order ?? 0];
  };
  const results = filterTasks(data, filters).sort((a, b) => {
    const [pa = 0, wa = 0] = rank(a.weekId);
    const [pb = 0, wb = 0] = rank(b.weekId);
    return pa - pb || wa - wb || a.order - b.order;
  });

  return (
    <section aria-label="Search results" className="rounded-xl border border-line bg-surface p-3">
      <p className="mb-2 text-sm text-muted" aria-live="polite">
        {results.length} {results.length === 1 ? 'task matches' : 'tasks match'}
      </p>
      <ul className="divide-y divide-line">
        {results.map((t) => {
          const week = data.weeks[t.weekId];
          const due = effectiveDueDate(t, week, data.settings);
          const overdue = isOverdue(t, due);
          const done = t.status === 'done';
          return (
            <li key={t.id} className="flex items-center gap-2 py-1.5">
              <input
                type="checkbox"
                className="size-4 accent-accent"
                checked={done}
                onChange={() => updateTask(t.id, { status: done ? 'not_started' : 'done' })}
                aria-label={`Mark "${t.title}" ${done ? 'not done' : 'done'}`}
              />
              <button onClick={() => openTask(t.id)} className={`min-w-0 flex-1 truncate text-left text-sm hover:underline ${done ? 'text-muted line-through' : ''}`}>
                {t.title}
              </button>
              <span className="hidden text-xs text-muted md:inline">
                {week?.weekNumber ? `Wk ${week.weekNumber}` : week?.title} · {STATUS_LABEL[t.status]}
              </span>
              <span className={`hidden rounded px-1.5 text-xs sm:inline ${TYPE_COLOR[t.type]}`}>{TYPE_LABEL[t.type]}</span>
              {due && (
                <span className={`w-14 text-right text-xs ${overdue ? 'font-semibold text-danger' : 'text-muted'}`}>
                  {overdue && <span className="sr-only">Overdue, </span>}
                  {format(parseISO(due), 'MMM d')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
