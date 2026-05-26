/**
 * Active booking sessions for Coach Calendar warnings and day indicators.
 * Populated from Sharetribe provider sales via coachCalendarBookings.js.
 */

/**
 * @typedef {Object} CoachCalendarBookingSession
 * @property {string} id
 * @property {string} transactionId
 * @property {string} dateKey ISO date key (YYYY-MM-DD)
 * @property {string} startTime HH:mm in listing timezone
 * @property {string} endTime HH:mm in listing timezone
 * @property {string} timeLabel Display range e.g. "08:00–10:00" or "All day"
 * @property {string} customerName
 * @property {string} sessionTitle Listing / session title
 * @property {string} statusLabel Localised status (Requested / Accepted)
 * @property {string} processState Raw process state id
 * @property {boolean} isAllDay
 * @property {'booking'} type
 */

/**
 * @param {Record<string, CoachCalendarBookingSession[]>} bookingsByDateKey
 * @param {string} dateKey
 * @returns {CoachCalendarBookingSession[]}
 */
export const getCoachCalendarBookingSessionsForDate = (bookingsByDateKey, dateKey) =>
  bookingsByDateKey?.[dateKey] || [];

/**
 * @param {Record<string, CoachCalendarBookingSession[]>} bookingsByDateKey
 * @param {string} dateKey
 * @returns {number}
 */
export const getCoachCalendarBookingCountForDate = (bookingsByDateKey, dateKey) =>
  getCoachCalendarBookingSessionsForDate(bookingsByDateKey, dateKey).length;
