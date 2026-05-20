/**
 * Date-range helpers for Coach Calendar multi-day selection.
 * All comparisons use local calendar days (midnight-normalised).
 */

export const startOfCalendarDay = date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const compareCalendarDays = (a, b) =>
  startOfCalendarDay(a).getTime() - startOfCalendarDay(b).getTime();

/**
 * @param {Date} a
 * @param {Date} b
 * @returns {{ start: Date, end: Date }}
 */
export const normalizeRangeBounds = (a, b) => {
  if (!a && !b) {
    return { start: null, end: null };
  }
  if (!a) {
    return { start: b, end: b };
  }
  if (!b) {
    return { start: a, end: a };
  }
  return compareCalendarDays(a, b) <= 0 ? { start: a, end: b } : { start: b, end: a };
};

/**
 * Inclusive list of calendar days from start through end.
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Date[]}
 */
export const getInclusiveDateRange = (startDate, endDate) => {
  const { start, end } = normalizeRangeBounds(startDate, endDate);
  if (!start || !end) {
    return [];
  }

  const dates = [];
  const cursor = startOfCalendarDay(start);
  const endTime = startOfCalendarDay(end).getTime();

  while (cursor.getTime() <= endTime) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

/**
 * @param {Date} date
 * @param {{ start: Date, end: Date }} bounds
 */
export const isDateInRangeBounds = (date, bounds) => {
  if (!date || !bounds?.start || !bounds?.end) {
    return false;
  }
  const t = startOfCalendarDay(date).getTime();
  const start = startOfCalendarDay(bounds.start).getTime();
  const end = startOfCalendarDay(bounds.end).getTime();
  return t >= start && t <= end;
};

export const isSameRangeBounds = (a, b) => {
  if (!a?.start || !a?.end || !b?.start || !b?.end) {
    return false;
  }
  return (
    compareCalendarDays(a.start, b.start) === 0 && compareCalendarDays(a.end, b.end) === 0
  );
};
