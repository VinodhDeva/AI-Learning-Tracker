import { useMemo } from 'react';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { hasFilters } from '../../lib/filter';
import { FilterBar } from '../search/FilterBar';
import { SearchResults } from '../search/SearchResults';
import { QuickAddAI } from '../ai/QuickAddAI';
import { SortableList } from '../../components/SortableList';
import { btnPrimary } from '../../components/ui';
import { byOrder } from '../../lib/select';
import { groupBy } from '../../lib/group';
import { currentWeekNumber } from '../../lib/dates';
import { mainTasks, percentDone } from '../../lib/progress';
import { PhaseSection, type PlanIndex } from './PhaseSection';

export function PlanPage() {
  const data = useTracker((s) => s.data);
  const { addPhase, reorderPhases } = useTracker.getState();
  const filtering = useUi((s) => hasFilters(s.filters));

  const index: PlanIndex = useMemo(() => {
    const hours = new Map<string, number>();
    for (const l of Object.values(data.timeLogs)) hours.set(l.taskId, (hours.get(l.taskId) ?? 0) + l.hours);
    return {
      weeksByPhase: groupBy(byOrder(Object.values(data.weeks)), (w) => w.phaseId),
      tasksByWeek: groupBy(byOrder(Object.values(data.tasks)), (t) => t.weekId),
      hoursByTask: hours,
      currentWeek: currentWeekNumber(data.settings.startDate),
      settings: data.settings,
    };
  }, [data.weeks, data.tasks, data.timeLogs, data.settings]);

  const phases = byOrder(Object.values(data.phases));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Plan</h1>
          <p className="text-sm text-muted">
            {percentDone(mainTasks(data))}% complete · Week {index.currentWeek} of 16
          </p>
        </div>
        <button className={btnPrimary} onClick={() => addPhase({ title: 'New phase' })}>
          + Add phase
        </button>
      </div>
      <QuickAddAI />
      <FilterBar />
      {filtering ? (
        <SearchResults />
      ) : (
        <SortableList ids={phases.map((p) => p.id)} onReorder={reorderPhases}>
          <div className="space-y-4">
            {phases.map((p) => (
              <PhaseSection key={p.id} phase={p} index={index} />
            ))}
          </div>
        </SortableList>
      )}
    </div>
  );
}
