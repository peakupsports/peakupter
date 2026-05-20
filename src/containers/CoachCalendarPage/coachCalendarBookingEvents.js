/**
 * Active booking/camp events for Coach Calendar day warnings.
 * Separate from manual blockedSlots — should come from Sharetribe transactions when wired.
 *
 * @typedef {Object} CoachCalendarBookingEvent
 * @property {string} id
 * @property {string} dateKey ISO date key (YYYY-MM-DD)
 * @property {'booking'|'camp'} type
 * @property {number} count
 * @property {string} label Human-readable session or listing title
 */

const BOOKING_WARNING_TYPES = new Set(['booking', 'camp']);

/**
 * Returns booking/camp events for a calendar day that should trigger the active-bookings warning.
 * Empty until connected to provider transaction data.
 *
 * @param {string} dateKey
 * @returns {CoachCalendarBookingEvent[]}
 */
export const getCoachCalendarBookingEventsForDate = dateKey => {
  const events = [];

  return events.filter(
    event => event.dateKey === dateKey && BOOKING_WARNING_TYPES.has(event.type)
  );
};
