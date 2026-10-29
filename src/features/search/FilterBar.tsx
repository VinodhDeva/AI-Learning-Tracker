import { useEffect, useRef } from 'react';
import { Status, TaskType } from '../../types/schema';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { btn, field } from '../../components/ui';
import { NO_FILTERS, allTags, hasFilters } from '../../lib/filter';
import { STATUS_LABEL, TYPE_LABEL } from '../../lib/labels';
import { byOrder } from '../../lib/select';

export function FilterBar() {
  const data = useTracker((s) => s.data);
  const f = useUi((s) => s.filters);
  const setFilters = useUi((s) => s.setFilters);
  const focusSearch = useUi((s) => s.focusSearch);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusSearch) return;
    searchRef.current?.focus();
    useUi.getState().setFocusSearch(false);
  }, [focusSearch]);

  return (
    <div role="search" aria-label="Filter tasks" className="flex flex-wrap items-center gap-2">
      <input
        ref={searchRef}
        type="search"
        className={`${field} min-w-48 flex-1`}
        placeholder="Search tasks (press /)"
        aria-label="Search tasks"
        value={f.q}
        onChange={(e) => setFilters({ q: e.target.value })}
        onKeyDown={(e) => e.key === 'Escape' && (e.currentTarget.blur(), setFilters({ q: '' }))}
      />
      <select className={field} aria-label="Filter by phase" value={f.phaseId} onChange={(e) => setFilters({ phaseId: e.target.value })}>
        <option value="">All phases</option>
        {byOrder(Object.values(data.phases)).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      <select className={field} aria-label="Filter by status" value={f.status} onChange={(e) => setFilters({ status: e.target.value ? Status.parse(e.target.value) : '' })}>
        <option value="">Any status</option>
        {Status.options.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <select className={field} aria-label="Filter by type" value={f.type} onChange={(e) => setFilters({ type: e.target.value ? TaskType.parse(e.target.value) : '' })}>
        <option value="">Any type</option>
        {TaskType.options.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
      </select>
      <select className={field} aria-label="Filter by tag" value={f.tag} onChange={(e) => setFilters({ tag: e.target.value })}>
        <option value="">Any tag</option>
        {allTags(data).map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" className="size-4 accent-accent" checked={f.overdue} onChange={(e) => setFilters({ overdue: e.target.checked })} />
        Overdue
      </label>
      {hasFilters(f) && (
        <button className={btn} onClick={() => setFilters(NO_FILTERS)}>Clear</button>
      )}
    </div>
  );
}
