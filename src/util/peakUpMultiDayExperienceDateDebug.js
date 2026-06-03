import { isPeakUpMultiDayPurchaseTransaction } from './peakUpMultiDayPurchase';
import {
  getPeakUpMultiDayExperiencePhase,
  getPeakUpMultiDayExperienceProtectedDates,
} from './peakUpCoachBookingTransaction';

const DEBUG_PREFIX = '[PeakUp MULTI-DAY DATE INSPECT]';

/**
 * Debug-only: log structured date fields for a multi-day purchase transaction.
 * Does not mutate transaction data.
 *
 * @param {Object} transaction
 * @param {string} [context]
 */
export const debugInspectMultiDayExperienceDates = (transaction, context = 'unknown') => {
  if (typeof console === 'undefined' || !console.log) {
    return;
  }

  if (!isPeakUpMultiDayPurchaseTransaction(transaction)) {
    return;
  }

  const protectedData = transaction?.attributes?.protectedData || {};
  const listingPublicData = transaction?.listing?.attributes?.publicData || {};
  const lineItems = transaction?.attributes?.lineItems || [];
  const bookingEntity = transaction?.booking?.attributes || null;

  console.log(DEBUG_PREFIX, {
    context,
    transactionId: transaction?.id?.uuid || null,
    listingId: transaction?.listing?.id?.uuid || null,
    listingTitle: transaction?.listing?.attributes?.title || null,
    processName: transaction?.attributes?.processName || null,
    lastTransition: transaction?.attributes?.lastTransition || null,
    dateFields: {
      bookingDates: protectedData.bookingDates ?? null,
      experienceStartDate: protectedData.experienceStartDate ?? null,
      experienceEndDate: protectedData.experienceEndDate ?? null,
      startDate: protectedData.startDate ?? null,
      endDate: protectedData.endDate ?? null,
      peakupBookingSlots: protectedData.peakupBookingSlots ?? null,
    },
    resolvedProtectedDates: getPeakUpMultiDayExperienceProtectedDates(transaction),
    resolvedPhase: getPeakUpMultiDayExperiencePhase(transaction),
    bookingEntity: bookingEntity
      ? {
          start: bookingEntity.start ?? bookingEntity.displayStart ?? null,
          end: bookingEntity.end ?? bookingEntity.displayEnd ?? null,
        }
      : null,
    protectedData,
    listingPublicData,
    lineItems,
  });
};

/**
 * Debug-only: inspect every multi-day purchase in a transaction batch.
 *
 * @param {Array<Object>} transactions
 * @param {string} [context]
 */
export const debugInspectMultiDayExperienceDateBatch = (transactions, context = 'unknown') => {
  (transactions || []).forEach(transaction => {
    debugInspectMultiDayExperienceDates(transaction, context);
  });
};
