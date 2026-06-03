import {
  isBookingProcess,
  isBookingProcessAlias,
  resolveLatestProcessName,
} from '../transactions/transaction';
import { peakupPrimaryBookingDatesFromSlots } from './peakupMultiSlotCheckout';
import { isPeakUpMultiDayPurchaseTransaction } from './peakUpMultiDayPurchase';

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

  const protectedData = transaction?.attributes?.protectedData || {};
  const storedDates = protectedData.bookingDates;

  if (storedDates) {
    const start = storedDates.bookingStart ?? storedDates.startDate;
    const end = storedDates.bookingEnd ?? storedDates.endDate;
    if (start) {
      return {
        bookingStart: start,
        bookingEnd: end || start,
      };
    }
  }

  const fromSlots = peakupPrimaryBookingDatesFromSlots(protectedData.peakupBookingSlots);
  if (fromSlots) {
    return {
      bookingStart: fromSlots.bookingStart.toISOString(),
      bookingEnd: fromSlots.bookingEnd.toISOString(),
    };
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
