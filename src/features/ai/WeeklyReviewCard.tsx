import { useState } from 'react';
import { format } from 'date-fns';
import type { TrackerData, Week } from '../../types/schema';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { btn } from '../../components/ui';
import { aiWeeklyReview, type WeeklyReviewInput } from '../../lib/ai';
import { weekEnd, weekStart } from '../../lib/dates';
import { currentWeek, hoursThisWeek } from '../../lib/progress';

const label = (w: Week) => (w.weekNumber ? `Week ${w.weekNumber}: ${w.title}` : w.title);

function tasksOf(d: TrackerData, w: Week) {
  const tasks = Object.values(d.tasks).filter((t) => t.weekId === w.id);
  return {
    label: label(w),
    done: tasks.filter((t) => t.status === 'done').map((t) => t.title),
    open: tasks.filter((t) => t.status !== 'done').map((t) => t.title),
  };
}

/** Everything the review is based on: this week's tasks, hours and journal, plus next week's plan. */
export function weeklyReviewInput(d: TrackerData, week: Week): WeeklyReviewInput {
  const n = week.weekNumber ?? 1;
  const [from, to] = [weekStart(d.settings.startDate, n), weekEnd(d.settings.startDate, n)];
  const next = Object.values(d.weeks).find((w) => w.weekNumber === n + 1 && d.phases[w.phaseId]?.kind === 'main');
  return {
    week: tasksOf(d, week),
    nextWeek: next ? tasksOf(d, next) : null,
    hoursLogged: Math.min(200, hoursThisWeek(d)),
    hourTarget: d.settings.weeklyHourTarget,
    journal: Object.values(d.journal)
      .filter((j) => j.date >= from && j.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function WeeklyReviewCard() {
  const data = useTracker((s) => s.data);
  const saved = useUi((s) => s.lastReview);
  const setLastReview = useUi((s) => s.setLastReview);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const week = currentWeek(data);
  const review = saved && week && saved.weekId === week.id ? saved : null;

  const onGenerate = async () => {
    if (!week) return;
    setBusy(true);
    setError(null);
    try {
      const result = await aiWeeklyReview(weeklyReviewInput(data, week));
      setLastReview({ weekId: week.id, at: new Date().toISOString(), review: result });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Weekly review" className="min-w-0 rounded-xl border border-dashed border-teal bg-surface p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Weekly review</h2>
        <button className={btn} onClick={onGenerate} disabled={busy || !week}>
          {busy ? 'Reviewing…' : review ? '✨ Regenerate' : '✨ Review my week'}
        </button>
      </div>
      {!week && <p className="text-sm italic text-muted">Available while the plan is running.</p>}
      {week && !review && !error && (
        <p className="text-sm text-muted">Summarizes your journal, hours and tasks for this week and suggests next week's focus.</p>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {review && (
        <div className="space-y-3 text-sm">
          <p>{review.review.summary}</p>
          <ReviewList title="Wins" items={review.review.wins} />
          <ReviewList title="Blockers" items={review.review.blockers} />
          <ReviewList title="Focus for next week" items={review.review.nextWeekFocus} />
          <p className="text-xs text-muted">Generated {format(new Date(review.at), 'EEE, MMM d, h:mm a')}</p>
        </div>
      )}
    </section>
  );
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}
