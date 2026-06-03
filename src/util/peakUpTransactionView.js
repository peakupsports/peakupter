import {
  isBookingProcess,
  isBookingProcessAlias,
  resolveLatestProcessName,
} from '../transactions/transaction';
import { isPeakUpConversationView } from './peakUpConversationView';
import { isPeakUpMultiDayPurchaseTransaction } from './peakUpMultiDayPurchase';

/**
 * True when the transaction page should use PeakUp checkout-style theming
 * (booking orders/sales — not inquiry conversation layout).
 *
 * @param {Object} transaction
 * @param {string} [processName]
 * @returns {boolean}
 */
export const isPeakUpBookingTransactionView = (transaction, processName) => {
  if (!transaction) {
    return false;
  }

  const name =
    processName ?? transaction?.attributes?.processName ?? resolveLatestProcessName(processName);

  if (!name) {
    return false;
  }

  const isBooking = name.includes('/')
    ? isBookingProcessAlias(name)
    : isBookingProcess(resolveLatestProcessName(name));

  if (!isBooking) {
    return false;
  }

  return !isPeakUpConversationView(transaction);
};

/**
 * True when the transaction page should use PeakUp checkout-style theming
 * for Multi-Day Experience / default-purchase-day orders and sales.
 *
 * @param {Object} transaction
 * @param {string} [processName]
 * @returns {boolean}
 */
export const isPeakUpMultiDayPurchaseTransactionView = (transaction, processName) => {
  if (!transaction) {
    return false;
  }

  if (isPeakUpConversationView(transaction)) {
    return false;
  }

  return isPeakUpMultiDayPurchaseTransaction(transaction, processName);
};

/**
 * PeakUp dark transaction detail shell — standard coach bookings and multi-day events.
 *
 * @param {Object} transaction
 * @param {string} [processName]
 * @returns {boolean}
 */
export const isPeakUpTransactionDetailsDarkTheme = (transaction, processName) =>
  isPeakUpBookingTransactionView(transaction, processName) ||
  isPeakUpMultiDayPurchaseTransactionView(transaction, processName);
