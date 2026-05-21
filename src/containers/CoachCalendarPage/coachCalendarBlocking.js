import { coachCalendarToDateKey } from './coachCalendarBookings';

/**
 * Detect when manual blocks overlap active coach bookings.
 */

/**
 * @param {string} hhmm "HH:mm"
 * @returns {number}
 */
export const timeToMinutes = hhmm => {
  if (!hhmm) {
    return 0;
  }
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

/**
 * @param {string} aStart
 * @param {string} aEnd
 * @param {string} bStart
 * @param {string} bEnd
 * @returns {boolean}
 */
export const timeRangesOverlap = (aStart, aEnd, bStart, bEnd) =>
  timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);

/**
 * @param {import('./coachCalendarBookingEvents').CoachCalendarBookingSession} session
 * @param {boolean} allDayBlocked
 * @param {{ start: string, end: string }|null} newSlot
 * @returns {boolean}
 */
export const blockOverlapsBookingSession = (session, allDayBlocked, newSlot) => {
  if (allDayBlocked || session.isAllDay) {
    return true;
  }
  if (!newSlot?.start || !newSlot?.end) {
    return false;
  }
  return timeRangesOverlap(newSlot.start, newSlot.end, session.startTime, session.endTime);
};

/**
 * @typedef {Object} CoachCalendarBlockBookingConflict
 * @property {string} dateKey
 * @property {import('./coachCalendarBookingEvents').CoachCalendarBookingSession} session
 */

/**
 * @param {Object} params
 * @param {Date[]} params.dates
 * @param {boolean} params.allDayBlocked
 * @param {{ start: string, end: string }|null} [params.newSlot]
 * @param {Record<string, import('./coachCalendarBookingEvents').CoachCalendarBookingSession[]>} params.bookingsByDateKey
 * @returns {CoachCalendarBlockBookingConflict[]}
 */
export const getBlockBookingConflicts = ({ dates, allDayBlocked, newSlot = null, bookingsByDateKey }) => {
  const conflicts = [];
  const seen = new Set();

  (dates || []).forEach(date => {
    const dateKey = coachCalendarToDateKey(date);
    const sessions = bookingsByDateKey[dateKey] || [];

    sessions.forEach(session => {
      if (!blockOverlapsBookingSession(session, allDayBlocked, newSlot)) {
        return;
      }
      const key = `${dateKey}-${session.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        conflicts.push({ dateKey, session });
      }
    });
  });

  return conflicts;
};

/**
 * @param {import('../../util/reactIntl').IntlShape} intl
 * @param {CoachCalendarBlockBookingConflict[]} conflicts
 * @returns {string}
 */
export const formatBlockBookingConflictMessage = (intl, conflicts) => {
  if (!conflicts.length) {
    return '';
  }

  const lines = conflicts.slice(0, 5).map(({ session }) => {
    return intl.formatMessage(
      {
        id: 'CoachCalendarPage.blockBookingConflictLine',
        defaultMessage: '{time} · {customer} · {status}',
      },
      {
        time: session.timeLabel,
        customer: session.customerName,
        status: session.statusLabel,
      }
    );
  });

  const body = lines.join('\n');
  const more =
    conflicts.length > 5
      ? `\n${intl.formatMessage(
          {
            id: 'CoachCalendarPage.blockBookingConflictMore',
            defaultMessage: '…and {count} more.',
          },
          { count: conflicts.length - 5 }
        )}`
      : '';

  return intl.formatMessage(
    {
      id: 'CoachCalendarPage.blockBookingConflictConfirm',
      defaultMessage:
        'This time range overlaps with an existing booking.\n\n{details}{more}\n\nBlock anyway?',
    },
    { details: body, more }
  );
};
