import {
  isBookingProcess,
  isBookingProcessAlias,
  resolveLatestProcessName,
} from '../transactions/transaction';
import { peakupPrimaryBookingDatesFromSlots } from './peakupMultiSlotCheckout';
import { isPeakUpMultiDayPurchaseTransaction } from './peakUpMultiDayPurchase';
import {
  buildPeakUpMultiDayExperienceTransactionBookingDates,
} from './peakUpMultiDayExperienceListing';

const toCalendarDayMs = value => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

/**
 * Read structured multi-day experience dates from transaction protectedData only.
 *
 * Priority:
 * 1. bookingDates.startDate / endDate (bookingStart / bookingEnd aliases)
 * 2. experienceStartDate / experienceEndDate
 * 3. startDate / endDate
 * 4. peakupBookingSlots (checkout fallback)
 *
 * @param {Object} transaction
 * @returns {{ bookingStart: string, bookingEnd: string }|null}
 */
export const getPeakUpMultiDayExperienceProtectedDates = transaction => {
  const protectedData = transaction?.attributes?.protectedData || {};
  const bookingDates = protectedData.bookingDates;

  if (bookingDates && typeof bookingDates === 'object') {
    const start = bookingDates.startDate ?? bookingDates.bookingStart;
    const end = bookingDates.endDate ?? bookingDates.bookingEnd;
    if (start) {
      return {
        bookingStart: start,
        bookingEnd: end || start,
      };
    }
  }

  if (protectedData.experienceStartDate) {
    return {
      bookingStart: protectedData.experienceStartDate,
      bookingEnd: protectedData.experienceEndDate || protectedData.experienceStartDate,
    };
  }

  if (protectedData.startDate) {
    return {
      bookingStart: protectedData.startDate,
      bookingEnd: protectedData.endDate || protectedData.startDate,
    };
  }

  const fromSlots = peakupPrimaryBookingDatesFromSlots(protectedData.peakupBookingSlots);
  if (fromSlots) {
    return {
      bookingStart: fromSlots.bookingStart.toISOString(),
      bookingEnd: fromSlots.bookingEnd.toISOString(),
    };
  }

  const fromListing = buildPeakUpMultiDayExperienceTransactionBookingDates(
    transaction?.listing?.attributes?.publicData
  );
  if (fromListing) {
    return {
      bookingStart: fromListing.bookingStart,
      bookingEnd: fromListing.bookingEnd,
    };
  }

  return null;
};

/**
 * @param {Object} transaction
 * @returns {boolean}
 */
export const hasPeakUpMultiDayExperienceProtectedDates = transaction =>
  getPeakUpMultiDayExperienceProtectedDates(transaction) != null;

/**
 * Calendar-day phase for multi-day experience scheduling.
 *
 * @param {Object} transaction
 * @param {Date} [now]
 * @returns {'upcoming'|'active'|'past'|null}
 */
export const getPeakUpMultiDayExperiencePhase = (transaction, now = new Date()) => {
  const dates = getPeakUpMultiDayExperienceProtectedDates(transaction);
  if (!dates?.bookingStart) {
    return null;
  }

  const startDayMs = toCalendarDayMs(dates.bookingStart);
  const endDayMs = toCalendarDayMs(dates.bookingEnd || dates.bookingStart);
  const todayMs = toCalendarDayMs(now);

  if (startDayMs == null || endDayMs == null || todayMs == null) {
    return null;
  }

  if (todayMs < startDayMs) {
    return 'upcoming';
  }

  if (todayMs > endDayMs) {
    return 'past';
  }

  return 'active';
};

/**
 * @param {Object} transaction
 * @returns {number|null}
 */
export const getPeakUpMultiDayExperienceEndMs = transaction => {
  const dates = getPeakUpMultiDayExperienceProtectedDates(transaction);
  if (!dates?.bookingEnd) {
    return null;
  }

  const endMs = new Date(dates.bookingEnd).getTime();
  return Number.isNaN(endMs) ? null : endMs;
};

/**
 * True when a transaction should appear in PeakUp coach booking dashboards
 * (standard default-booking or Multi-Day Experience default-purchase).
 *
 * @param {Object} transaction
 * @param {string} [processName]
 * @returns {boolean}
 */
export const isPeakUpCoachBookingTransaction = (transaction, processName) => {
  const rawName = processName ?? transaction?.attributes?.processName;
  const isBooking = rawName?.includes('/')
    ? isBookingProcessAlias(rawName)
    : isBookingProcess(resolveLatestProcessName(rawName));

  if (isBooking) {
    return true;
  }

  return isPeakUpMultiDayPurchaseTransaction(transaction, processName);
};

/**
 * Resolve experience schedule from booking entity or transaction protectedData.
 *
 * @param {Object} transaction
 * @returns {{ bookingStart: string, bookingEnd: string }|null}
 */
export const getPeakUpCoachBookingSessionDates = transaction => {
  const bookingAttrs = transaction?.booking?.attributes;
  const bookingStart = bookingAttrs?.displayStart || bookingAttrs?.start;
  const bookingEnd = bookingAttrs?.displayEnd || bookingAttrs?.end;

  if (bookingStart) {
    return {
      bookingStart,
      bookingEnd: bookingEnd || bookingStart,
    };
  }

  const protectedDates = getPeakUpMultiDayExperienceProtectedDates(transaction);
  if (protectedDates) {
    return protectedDates;
  }

  return null;
};

/**
 * @param {Object} transaction
 * @returns {number|null}
 */
export const getPeakUpCoachBookingSessionStartMs = transaction => {
  const dates = getPeakUpCoachBookingSessionDates(transaction);
  if (!dates?.bookingStart) {
    return null;
  }

  const startMs = new Date(dates.bookingStart).getTime();
  return Number.isNaN(startMs) ? null : startMs;
};

/**
 * @param {Object} transaction
 * @returns {boolean}
 */
export const hasPeakUpCoachBookingSessionSchedule = transaction =>
  getPeakUpCoachBookingSessionStartMs(transaction) != null;

/** Process names queried for coach dashboard sales (booking + multi-day purchase). */
export const PEAKUP_COACH_DASHBOARD_SALES_PROCESS_NAMES = [
  'default-booking',
  'default-booking/release-1',
  'default-purchase',
  'default-purchase/release-1',
];

/** Active multi-day purchase states that can still be upcoming experiences. */
export const PEAKUP_MULTI_DAY_PURCHASE_UPCOMING_STATES = new Set([
  'purchased',
  'delivered',
  'pending-payment',
]);

/** Active multi-day purchase states shown as open/pending on the dashboard. */
export const PEAKUP_MULTI_DAY_PURCHASE_PENDING_STATES = new Set(['purchased', 'pending-payment']);
