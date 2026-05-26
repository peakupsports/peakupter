import { logPeakupTransactionFallbackError } from './errors';
import { LISTING_STATE_CLOSED } from './types';
import { getProcess, resolveLatestProcessName } from '../transactions/transaction';

/**
 * @param {Object} transaction
 * @param {Object} [process]
 * @returns {boolean}
 */
export const isCanceledBookingTransaction = (transaction, process) => {
  if (!transaction || !process?.states?.CANCELED) {
    return false;
  }
  try {
    return process.getState(transaction) === process.states.CANCELED;
  } catch (e) {
    return false;
  }
};

/**
 * Minimal listing shape for TransactionPage when the listing API entity is missing
 * (e.g. closed listing on a canceled booking).
 *
 * @param {Object} transaction denormalised transaction with customer/provider/booking
 * @returns {Object}
 */
export const buildFallbackListingFromTransaction = transaction => {
  const protectedData = transaction?.attributes?.protectedData || {};
  const listingRelationshipId = transaction?.relationships?.listing?.data?.id;
  const title =
    protectedData.priceVariantName ||
    protectedData.listingTitle ||
    transaction?.attributes?.metadata?.listingTitle ||
    'PeakUp session';

  const listing = {
    type: 'listing',
    attributes: {
      title,
      deleted: false,
      state: LISTING_STATE_CLOSED,
      publicData: {
        listingType: protectedData.listingType,
        unitType: protectedData.unitType,
      },
    },
    author: transaction?.provider || null,
    images: [],
  };

  if (listingRelationshipId) {
    listing.id = listingRelationshipId;
  }

  return listing;
};

/**
 * @param {Object} transaction
 * @param {Object|null|undefined} listing denormalised listing from transaction entity
 * @returns {{ listing: Object, listingUnavailable: boolean }}
 */
export const resolveTransactionPageListing = (transaction, listing) => {
  const hasListingEntity = Boolean(listing?.id?.uuid && listing?.attributes);
  if (hasListingEntity) {
    return { listing, listingUnavailable: false };
  }

  if (transaction?.id?.uuid) {
    logPeakupTransactionFallbackError(
      new Error('Listing entity missing; using transaction fallback listing'),
      {
        transactionId: transaction.id.uuid,
        listingRelationshipId: transaction?.relationships?.listing?.data?.id?.uuid || null,
      }
    );
  }

  return {
    listing: buildFallbackListingFromTransaction(transaction),
    listingUnavailable: true,
  };
};

/**
 * @param {Object} transaction
 * @returns {string|null}
 */
export const getTransactionProcessStateLabel = transaction => {
  const processName = resolveLatestProcessName(transaction?.attributes?.processName);
  if (!processName) {
    return null;
  }
  try {
    return getProcess(processName).getState(transaction);
  } catch (e) {
    return null;
  }
};
