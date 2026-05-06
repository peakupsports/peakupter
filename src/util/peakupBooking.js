import { timestampToDate } from './dates';

/**
 * Min/max timestamps for PeakUp booking (blocks calendar / booking entity).
 *
 * @param {Array<{ bookingStartTime: string, bookingEndTime: string }>} sessions
 */
export const peakupTimespanDatesFromSessions = sessions => {
  if (!sessions?.length) {
    return null;
  }
  const starts = sessions.map(s => timestampToDate(s.bookingStartTime)).filter(Boolean);
  const ends = sessions.map(s => timestampToDate(s.bookingEndTime)).filter(Boolean);
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
    const bs = timestampToDate(s.bookingStartTime);
    const be = timestampToDate(s.bookingEndTime);
    return {
      bookingStart: bs ? bs.toISOString() : null,
      bookingEnd: be ? be.toISOString() : null,
    };
  });
};
