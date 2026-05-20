import { isDevelopmentMode } from './isDevelopmentMode';

/**
 * @param {string} label
 * @param {Object} [data]
 */
export const logCoachCalendarDebug = (label, data) => {
  if (!isDevelopmentMode()) {
    return;
  }

  if (data !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`[PeakUp CoachCalendar] ${label}`, data);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[PeakUp CoachCalendar] ${label}`);
  }
};

/**
 * @param {string} label
 * @param {Object} [data]
 */
export const logCoachCalendarSyncTrace = (label, data) => {
  if (!isDevelopmentMode()) {
    return;
  }

  if (data !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`[PeakUp CoachCalendar] ${label}`, data);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[PeakUp CoachCalendar] ${label}`);
  }
};

/**
 * @param {string} label
 * @param {*} error
 * @param {Object} [data]
 */
export const logCoachCalendarSyncError = (label, error, data) => {
  if (!isDevelopmentMode()) {
    return;
  }

  if (data !== undefined) {
    // eslint-disable-next-line no-console
    console.error(`[PeakUp CoachCalendar] ${label}`, error, data);
  } else {
    // eslint-disable-next-line no-console
    console.error(`[PeakUp CoachCalendar] ${label}`, error);
  }
};

/**
 * Legacy skip details are included in sync all final skippedListingIds only.
 */
export const logSkippedLegacyListing = () => {};

/**
 * Booking calendar day availability (ListingPage / OrderPanel).
 *
 * @param {string} label
 * @param {Object} [data]
 */
export const logBookingCalendarDebug = (label, data) => {
  if (!isDevelopmentMode()) {
    return;
  }

  if (data !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`[PeakUp BookingCalendar] ${label}`, data);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[PeakUp BookingCalendar] ${label}`);
  }
};
