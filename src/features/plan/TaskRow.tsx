import { format, parseISO } from 'date-fns';
import type { Task, Week } from '../../types/schema';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { Sortable } from '../../components/SortableList';
import { btnDanger } from '../../components/ui';
import { TYPE_COLOR, TYPE_LABEL } from '../../lib/labels';
import { effectiveDueDate, isOverdue } from '../../lib/dates';
import type { PlanIndex } from './PhaseSection';

export function TaskRow({ task, week, index }: { task: Task; week: Week; index: PlanIndex }) {
  const { updateTask, deleteTask } = useTracker.getState();
  const openTask = useUi((s) => s.openTask);
  const due = effectiveDueDate(task, week, index.settings);
  const overdue = isOverdue(task, due);
  const spent = index.hoursByTask.get(task.id) ?? 0;
  const done = task.status === 'done';

  return (
    <Sortable as="li" id={task.id} label={`task ${task.title}`}>
      {(handle) => (
        <div className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-tint/40">
          {handle}
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={done}
            onChange={() => updateTask(task.id, { status: done ? 'not_started' : 'done' })}
            aria-label={`Mark "${task.title}" ${done ? 'not done' : 'done'}`}
          />
          <button
            type="button"
            onClick={() => openTask(task.id)}
            className={`min-w-0 flex-1 truncate text-left text-sm hover:underline ${done ? 'text-muted line-through' : ''}`}
          >
            {task.status === 'in_progress' && <span className="mr-1 text-coral" aria-label="In progress">●</span>}
            {task.title}
          </button>
          <span className={`hidden rounded px-1.5 text-xs sm:inline ${TYPE_COLOR[task.type]}`}>{TYPE_LABEL[task.type]}</span>
          {task.priority === 'high' && !done && (
            <span className="text-xs font-bold text-danger" title="High priority" aria-label="High priority">!</span>
          )}
          <span className="hidden w-14 text-right text-xs tabular-nums text-muted sm:inline" title="Hours spent / estimated">
            {spent}/{task.estimatedHours}h
          </span>
          {due && (
            <span className={`w-14 text-right text-xs ${overdue ? 'font-medium text-danger' : 'text-muted'}`}>
              {overdue && <span className="sr-only">Overdue, </span>}
              {format(parseISO(due), 'MMM d')}
            </span>
          )}
          <button
            className={`${btnDanger} opacity-0 focus:opacity-100 group-hover:opacity-100`}
            onClick={() => confirm(`Delete task "${task.title}"?`) && deleteTask(task.id)}
            aria-label={`Delete task ${task.title}`}
          >
            ✕
          </button>
        </div>
      )}
    </Sortable>
  );
}
