import { useState } from 'react';
import type { Task } from '../../types/schema';
import { useTracker } from '../../store/useTracker';
import { btn, btnPrimary } from '../../components/ui';
import { aiSubtasks, type Subtask } from '../../lib/ai';
import { TYPE_LABEL } from '../../lib/labels';
import { byOrder } from '../../lib/select';

/** Suggests subtasks for `task`; the ones kept become tasks right after it in the same week. */
export function SubtasksButton({ task }: { task: Task }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<(Subtask & { keep: boolean })[] | null>(null);

  const onSuggest = async () => {
    setBusy(true);
    setError(null);
    try {
      setItems((await aiSubtasks(task)).map((s) => ({ ...s, keep: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onAdd = () => {
    const { addTask, moveTask } = useTracker.getState();
    const newIds = (items ?? [])
      .filter((s) => s.keep)
      .map((s) =>
        addTask(task.weekId, {
          title: s.title,
          type: s.type,
          estimatedHours: s.estimatedHours,
          tags: task.tags,
          notes: `Subtask of **${task.title}**`,
        }),
      );
    // Place the new tasks directly after the parent.
    const others = byOrder(Object.values(useTracker.getState().data.tasks).filter((t) => t.weekId === task.weekId))
      .map((t) => t.id)
      .filter((id) => !newIds.includes(id));
    const at = others.indexOf(task.id) + 1;
    const ordered = [...others.slice(0, at), ...newIds, ...others.slice(at)];
    if (newIds[0]) moveTask(newIds[0], task.weekId, ordered);
    setItems(null);
  };

  const kept = items?.filter((s) => s.keep).length ?? 0;

  return (
    <section aria-labelledby="subtasks-h">
      <div className="flex items-center gap-2">
        <h3 id="subtasks-h" className="text-sm font-semibold">Subtasks</h3>
        {!items && (
          <button className={btn} onClick={onSuggest} disabled={busy}>
            {busy ? 'Thinking…' : '✨ Break into subtasks'}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
      {items && (
        <div className="mt-2 space-y-2">
          <ul className="space-y-1">
            {items.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-accent"
                  checked={s.keep}
                  aria-label={`Keep subtask "${s.title}"`}
                  onChange={() => setItems(items.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))}
                />
                <span className="flex-1">{s.title}</span>
                <span className="text-xs text-muted">{TYPE_LABEL[s.type]} · {s.estimatedHours}h</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button className={btnPrimary} onClick={onAdd} disabled={kept === 0}>
              Add {kept} {kept === 1 ? 'task' : 'tasks'}
            </button>
            <button className={btn} onClick={() => setItems(null)}>Discard</button>
          </div>
        </div>
      )}
    </section>
  );
}
