import { describe, expect, it } from 'vitest';
import { heatLevel, heatmapWeeks } from './heatmap';

describe('heatmap', () => {
  it('maps hours and journal to levels', () => {
    expect(heatLevel(0, false)).toBe(0);
    expect(heatLevel(0, true)).toBe(1);
    expect(heatLevel(0.5, false)).toBe(1);
    expect(heatLevel(1, false)).toBe(2);
    expect(heatLevel(2.5, false)).toBe(3);
    expect(heatLevel(6, false)).toBe(4);
  });

  it('covers the 16-week plan in Monday-start columns and flags the future', () => {
    const weeks = heatmapWeeks('2026-01-07', '2026-01-08', new Map([['2026-01-07', 2]]), new Set(['2026-01-08']));
    expect(weeks).toHaveLength(17); // start is a Wednesday, so 16 weeks span 17 calendar weeks
    expect(weeks[0]![0]!.date).toBe('2026-01-05');
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    const cells = weeks.flat();
    expect(cells.find((c) => c.date === '2026-01-07')).toMatchObject({ hours: 2, level: 3, future: false });
    expect(cells.find((c) => c.date === '2026-01-08')).toMatchObject({ journal: true, level: 1 });
    expect(cells.find((c) => c.date === '2026-01-09')?.future).toBe(true);
  });

  it('caps history at about a year', () => {
    const weeks = heatmapWeeks('2020-01-06', '2026-01-07', new Map(), new Set());
    expect(weeks.length).toBe(53);
  });
});
