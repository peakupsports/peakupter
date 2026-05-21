import {
  isBookingProcess,
  isBookingProcessAlias,
  resolveLatestProcessName,
} from '../transactions/transaction';
import { isPeakUpConversationView } from './peakUpConversationView';

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
