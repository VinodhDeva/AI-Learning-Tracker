import { addDays, differenceInCalendarWeeks, max, parseISO, startOfWeek } from 'date-fns';
import { toIso } from './dates';

export interface HeatCell {
  date: string;
  hours: number;
  journal: boolean;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/** 0 = nothing, 1 = journal only or under 1h, then 1h, 2h, 3h+. */
export function heatLevel(hours: number, journal: boolean): HeatCell['level'] {
  if (hours >= 3) return 4;
  if (hours >= 2) return 3;
  if (hours >= 1) return 2;
  return hours > 0 || journal ? 1 : 0;
}

/**
 * Week columns (Mon-Sun) from the plan start, or from a year ago if the plan started earlier,
 * through the later of today and the end of week 16.
 */
export function heatmapWeeks(
  startDate: string,
  today: string,
  hours: Map<string, number>,
  journalDates: Set<string>,
): HeatCell[][] {
  const todayD = parseISO(today);
  const first = startOfWeek(max([parseISO(startDate), addDays(todayD, -52 * 7)]), { weekStartsOn: 1 });
  const last = max([todayD, addDays(parseISO(startDate), 16 * 7 - 1)]);
  const count = differenceInCalendarWeeks(last, first, { weekStartsOn: 1 }) + 1;

  return Array.from({ length: count }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = toIso(addDays(first, w * 7 + d));
      const h = hours.get(date) ?? 0;
      const journal = journalDates.has(date);
      return { date, hours: h, journal, level: heatLevel(h, journal), future: date > today };
    }),
  );
}
