import type { Phase, Settings, Task, Week } from '../../types/schema';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { InlineEdit } from '../../components/InlineEdit';
import { Sortable, SortableList } from '../../components/SortableList';
import { btn, btnDanger } from '../../components/ui';
import { percentDone } from '../../lib/progress';
import { ExpandButton } from './bits';
import { ProgressBar } from '../../components/ProgressBar';
import { WeekSection } from './WeekSection';

export interface PlanIndex {
  weeksByPhase: Map<string, Week[]>;
  tasksByWeek: Map<string, Task[]>;
  hoursByTask: Map<string, number>;
  currentWeek: number;
  settings: Settings;
}

export function PhaseSection({ phase, index }: { phase: Phase; index: PlanIndex }) {
  const { updatePhase, deletePhase, addWeek, reorderWeeks } = useTracker.getState();
  const open = useUi((s) => s.expanded[phase.id] ?? true);
  const setExpanded = useUi((s) => s.setExpanded);

  const weeks = index.weeksByPhase.get(phase.id) ?? [];
  const tasks = weeks.flatMap((w) => index.tasksByWeek.get(w.id) ?? []);
  const pct = percentDone(tasks);
  const bodyId = `phase-${phase.id}`;

  const onAddWeek = () => {
    const nums = [...index.weeksByPhase.values()].flat().map((w) => w.weekNumber ?? 0);
    const weekNumber = phase.kind === 'main' ? Math.min(52, Math.max(0, ...nums) + 1) : null;
    const id = addWeek(phase.id, { title: phase.kind === 'main' ? 'New week' : 'New list', weekNumber });
    setExpanded(id, true);
  };
  const onDelete = () => {
    if (confirm(`Delete phase "${phase.title}" with its ${weeks.length} weeks, ${tasks.length} tasks and projects?`)) {
      deletePhase(phase.id);
    }
  };

  return (
    <Sortable id={phase.id} label={`phase ${phase.title}`}>
      {(handle) => (
        <section
          aria-label={`Phase: ${phase.title}`}
          className="rounded-xl border border-line bg-surface"
        >
          <header className="flex items-start gap-2 p-3">
            <div className="flex items-center pt-0.5">
              {handle}
              <ExpandButton open={open} controls={bodyId} label={phase.title} onToggle={() => setExpanded(phase.id, !open)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2 className="text-lg font-semibold">
                  <InlineEdit label="Phase title" value={phase.title} onSave={(title) => updatePhase(phase.id, { title })} />
                </h2>
                <span className="text-sm text-muted">
                  <InlineEdit label="Week range" value={phase.weekRange} placeholder="Add week range" onSave={(weekRange) => updatePhase(phase.id, { weekRange })} />
                </span>
              </div>
              <div className="text-sm text-muted">
                <InlineEdit label="Goal" multiline value={phase.goal} onSave={(goal) => updatePhase(phase.id, { goal })} />
              </div>
              <ProgressBar pct={pct} label={`${phase.title} progress`} />
            </div>
            <button className={btnDanger} onClick={onDelete} aria-label={`Delete phase ${phase.title}`}>
              ✕
            </button>
          </header>

          {open && (
            <div id={bodyId} className="space-y-2 px-3 pb-3">
              <SortableList ids={weeks.map((w) => w.id)} onReorder={reorderWeeks}>
                {weeks.map((w) => (
                  <WeekSection key={w.id} week={w} index={index} />
                ))}
              </SortableList>
              <button className={btn} onClick={onAddWeek}>
                + Add {phase.kind === 'main' ? 'week' : 'list'}
              </button>
            </div>
          )}
        </section>
      )}
    </Sortable>
  );
}
