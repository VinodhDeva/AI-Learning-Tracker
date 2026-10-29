import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { format, parseISO } from 'date-fns';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { ProgressBar } from '../../components/ProgressBar';
import { currentWeekNumber, todayIso, weekEnd, weekStart } from '../../lib/dates';
import { currentWeek, hoursThisWeek, mainTasks, percentDone, streak, studyDays, upcoming } from '../../lib/progress';
import { byOrder } from '../../lib/select';
import { groupBy } from '../../lib/group';
import { TYPE_COLOR, TYPE_LABEL } from '../../lib/labels';
import { WeeklyReviewCard } from '../ai/WeeklyReviewCard';

const short = (iso: string) => format(parseISO(iso), 'MMM d');

export function DashboardPage() {
  const data = useTracker((s) => s.data);
  const updateTask = useTracker((s) => s.updateTask);
  const openTask = useUi((s) => s.openTask);
  const today = todayIso();
  const { startDate, weeklyHourTarget } = data.settings;

  const tasks = mainTasks(data);
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const weekNo = currentWeekNumber(startDate, today);
  const week = currentWeek(data, today);
  const weekTasks = week ? byOrder(Object.values(data.tasks).filter((t) => t.weekId === week.id)) : [];
  const hours = hoursThisWeek(data, today);
  const days = streak(data, today);
  const studiedToday = studyDays(data).has(today);
  const due = upcoming(data, 8, today);
  const tasksByWeek = groupBy(Object.values(data.tasks), (t) => t.weekId);
  const phases = byOrder(Object.values(data.phases)).filter((p) => p.kind === 'main');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Overall complete" value={`${percentDone(tasks)}%`} sub={`${doneCount} of ${tasks.length} tasks`}>
          <ProgressBar pct={percentDone(tasks)} label="Overall progress" />
        </Tile>
        <Tile
          label="Hours this week"
          value={`${round(hours)}h`}
          sub={hours >= weeklyHourTarget ? `Target of ${weeklyHourTarget}h reached` : `${round(weeklyHourTarget - hours)}h to ${weeklyHourTarget}h target`}
        >
          <ProgressBar pct={Math.min(100, Math.round((hours / weeklyHourTarget) * 100))} label="Hours toward weekly target" />
        </Tile>
        <Tile
          label="Study streak"
          value={`${days} ${days === 1 ? 'day' : 'days'}`}
          sub={studiedToday ? 'Studied today' : 'Log hours or a journal entry today to keep it going'}
        />
        <Tile
          label="Current week"
          value={weekNo < 1 ? 'Not started' : week ? `Week ${weekNo}` : 'Plan finished'}
          sub={weekNo < 1 ? `Starts ${format(parseISO(startDate), 'EEE, MMM d')}` : week ? week.title : 'All 16 weeks are behind you'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title={week ? `This week · ${short(weekStart(startDate, weekNo))} – ${short(weekEnd(startDate, weekNo))}` : 'This week'}
          action={<Link to="/plan" className="text-sm text-accent hover:underline">Open plan</Link>}
        >
          {weekTasks.length === 0 ? (
            <Empty>No tasks for this week.</Empty>
          ) : (
            <>
              <ProgressBar pct={percentDone(weekTasks)} label="This week's progress" />
              <ul className="mt-2 space-y-1">
                {weekTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-accent"
                      checked={t.status === 'done'}
                      onChange={() => updateTask(t.id, { status: t.status === 'done' ? 'not_started' : 'done' })}
                      aria-label={`Mark "${t.title}" ${t.status === 'done' ? 'not done' : 'done'}`}
                    />
                    <button
                      onClick={() => openTask(t.id)}
                      className={`min-w-0 flex-1 truncate text-left text-sm hover:underline ${t.status === 'done' ? 'text-muted line-through' : ''}`}
                    >
                      {t.title}
                    </button>
                    <span className={`rounded px-1.5 text-xs ${TYPE_COLOR[t.type]}`}>{TYPE_LABEL[t.type]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Upcoming and overdue">
          {due.length === 0 ? (
            <Empty>Nothing due. Nice.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {due.map(({ task, week: w, due: d, overdue }) => (
                <li key={task.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <button onClick={() => openTask(task.id)} className="min-w-0 flex-1 truncate text-left hover:underline">
                    {task.title}
                  </button>
                  <span className="hidden truncate text-xs text-muted sm:inline">{w?.weekNumber ? `Wk ${w.weekNumber}` : w?.title}</span>
                  <span className={`w-20 text-right text-xs ${overdue ? 'font-semibold text-danger' : 'text-muted'}`}>
                    {overdue ? `Overdue · ${short(d)}` : short(d)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <WeeklyReviewCard />

      <Card title="Phase progress">
        <ul className="space-y-3">
          {phases.map((p) => {
            const phaseTasks = Object.values(data.weeks)
              .filter((w) => w.phaseId === p.id)
              .flatMap((w) => tasksByWeek.get(w.id) ?? []);
            return (
              <li key={p.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{p.title}</span>
                  <span className="text-muted">{p.weekRange}</span>
                </div>
                <ProgressBar pct={percentDone(phaseTasks)} label={`${p.title} progress`} />
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

const round = (n: number) => Math.round(n * 10) / 10;

function Tile({ label, value, sub, children }: { label: string; value: string; sub: string; children?: ReactNode }) {
  return (
    <section aria-label={label} className="rounded-xl border border-line bg-surface p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">{label}</h2>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted">{sub}</p>
      {children}
    </section>
  );
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="min-w-0 rounded-xl border border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="text-sm italic text-muted">{children}</p>;
