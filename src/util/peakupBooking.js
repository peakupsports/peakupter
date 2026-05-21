import { timestampToDate } from './dates';

/**
 * Picker ms strings or ISO checkout slots.
 *
 * @param {string|number|Date|null|undefined} raw
 * @returns {Date|null}
 */
export const peakupParseSlotInstant = raw => {
  if (raw == null) {
    return null;
  }
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  const str = String(raw);
  if (/^\d+$/.test(str)) {
    const fromMs = timestampToDate(str);
    return fromMs && !Number.isNaN(fromMs.getTime()) ? fromMs : null;
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const peakupSessionStart = s => peakupParseSlotInstant(s.bookingStartTime ?? s.bookingStart);
const peakupSessionEnd = s => peakupParseSlotInstant(s.bookingEndTime ?? s.bookingEnd);

/**
 * Min/max timestamps for PeakUp booking (blocks calendar / booking entity).
 *
 * @param {Array<{ bookingStartTime: string, bookingEndTime: string }>} sessions
 */
export const peakupTimespanDatesFromSessions = sessions => {
  if (!sessions?.length) {
    return null;
  }
  const starts = sessions.map(peakupSessionStart).filter(Boolean);
  const ends = sessions.map(peakupSessionEnd).filter(Boolean);
  if (!starts.length || !ends.length) {
    return null;
  }
  const bookingStart = new Date(Math.min(...starts.map(d => d.getTime())));
  const bookingEnd = new Date(Math.max(...ends.map(d => d.getTime())));
  return { bookingStart, bookingEnd };
};

/**
 * @param {Array<{ bookingStartTime: string, bookingEndTime: string }>} sessions
 */
export const peakupNormalizeSessionsForCheckout = sessions => {
  return sessions.map(s => {
    const bs = peakupParseSlotInstant(s.bookingStartTime ?? s.bookingStart);
    const be = peakupParseSlotInstant(s.bookingEndTime ?? s.bookingEnd);
    return {
      bookingStart: bs ? bs.toISOString() : null,
      bookingEnd: be ? be.toISOString() : null,
    };
  });
};
