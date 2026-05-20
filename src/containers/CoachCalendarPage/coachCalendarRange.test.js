import {
  compareCalendarDays,
  getInclusiveDateRange,
  isDateInRangeBounds,
  normalizeRangeBounds,
} from './coachCalendarRange';

describe('coachCalendarRange', () => {
  it('normalizes reversed bounds', () => {
    const start = new Date(2026, 4, 21);
    const end = new Date(2026, 4, 31);
    expect(normalizeRangeBounds(end, start)).toEqual({ start, end });
  });

  it('returns inclusive dates across month boundaries', () => {
    const range = getInclusiveDateRange(new Date(2026, 0, 30), new Date(2026, 1, 2));
    expect(range).toHaveLength(4);
    expect(range[0].getDate()).toBe(30);
    expect(range[0].getMonth()).toBe(0);
    expect(range[3].getDate()).toBe(2);
    expect(range[3].getMonth()).toBe(1);
  });

  it('detects membership in bounds', () => {
    const bounds = normalizeRangeBounds(new Date(2026, 4, 21), new Date(2026, 4, 25));
    expect(isDateInRangeBounds(new Date(2026, 4, 23), bounds)).toBe(true);
    expect(isDateInRangeBounds(new Date(2026, 4, 26), bounds)).toBe(false);
  });

  it('compareCalendarDays orders correctly', () => {
    expect(compareCalendarDays(new Date(2026, 0, 1), new Date(2026, 0, 2))).toBeLessThan(0);
  });
});
