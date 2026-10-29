import { useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import type { HeatCell } from '../../lib/heatmap';

// One hue, light to dark: identity is "how much", so a sequential ramp of the accent.
const LEVEL_CLASS = ['bg-line/60', 'bg-accent/25', 'bg-accent/50', 'bg-accent/75', 'bg-accent'] as const;
const LEVEL_LABEL = ['No study', 'Journal or under 1h', '1–2h', '2–3h', '3h or more'];
const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export function describeCell(c: HeatCell) {
  const parts = [`${c.hours}h logged`];
  if (c.journal) parts.push('journal entry');
  return `${format(parseISO(c.date), 'EEE, MMM d, yyyy')}: ${parts.join(', ')}`;
}

export function Heatmap({ weeks, today, selected, onSelect }: {
  weeks: HeatCell[][];
  today: string;
  selected: string;
  onSelect(date: string): void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Start scrolled to the most recent weeks.
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);

  return (
    <div>
      <div ref={scroller} className="overflow-x-auto pb-1">
        <div className="inline-flex gap-[3px]" role="group" aria-label="Study days calendar">
          <div className="flex flex-col gap-[3px] pt-4 pr-1 text-[10px] text-muted" aria-hidden>
            {WEEKDAYS.map((d, i) => <span key={i} className="h-3.5 leading-3.5">{d}</span>)}
          </div>
          {weeks.map((col, wi) => {
            const first = col[0]!;
            const prev = weeks[wi - 1]?.[0];
            const month = !prev || prev.date.slice(5, 7) !== first.date.slice(5, 7) ? format(parseISO(first.date), 'MMM') : '';
            return (
              <div key={first.date} className="flex flex-col gap-[3px]">
                <span className="h-4 text-[10px] text-muted" aria-hidden>{month}</span>
                {col.map((c) => (
                  <button
                    key={c.date}
                    type="button"
                    disabled={c.future}
                    onClick={() => onSelect(c.date)}
                    aria-label={describeCell(c)}
                    aria-pressed={c.date === selected}
                    title={describeCell(c)}
                    className={`size-3.5 rounded-[3px] ${c.future ? 'bg-line/25' : LEVEL_CLASS[c.level]} ${
                      c.date === selected ? 'ring-2 ring-ink' : c.date === today ? 'ring-1 ring-muted' : ''
                    } hover:ring-2 hover:ring-accent-hover disabled:hover:ring-0`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-muted">
        Less
        {LEVEL_CLASS.map((cls, i) => (
          <span key={i} className={`size-3 rounded-[3px] ${cls}`} title={LEVEL_LABEL[i]} aria-label={LEVEL_LABEL[i]} role="img" />
        ))}
        More
      </div>
    </div>
  );
}
