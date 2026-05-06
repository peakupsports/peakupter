const {
  consumePeakupBookingHold,
  peakHoldEntry,
  peakHoldMatchesMergedOrderData,
} = require('./peakupBookingHoldStore');

const listingUuidFromEntity = listing => listing?.id?.uuid ?? null;

/**
 * Ensure an in-process slot hold matches the initiating order before Sharetribe `transactions/initiate`.
 * @param {boolean} options.isSpeculative
 */
exports.validatePeakUpHoldBeforeInitiate = ({ isSpeculative, listing, mergedOrderData, peakupBookingHoldId }) => {
  if (isSpeculative) return;
  if (!listing?.attributes?.publicData?.peakupBookingListing) return;

  const needsHold =
    mergedOrderData &&
    typeof mergedOrderData.peakupSessionCount === 'number' &&
    mergedOrderData.peakupSessionCount > 0;

  if (!needsHold || !peakupBookingHoldId) {
    return;
  }

  const entry = peakHoldEntry(peakupBookingHoldId);
  if (!entry) {
    const err = new Error(
      'Your slot reservation expired. Go back to the listing and reserve your coaching sessions again.'
    );
    err.status = 409;
    err.statusText = err.message;
    err.data = {};
    throw err;
  }

  if (listingUuidFromEntity(listing) !== entry.listingUuid) {
    const err = new Error('The booking reservation does not match this listing.');
    err.status = 400;
    err.statusText = err.message;
    err.data = {};
    throw err;
  }

  if (!peakHoldMatchesMergedOrderData(entry, mergedOrderData)) {
    const err = new Error(
      'The reservation does not match the sessions in your order. Return to the listing and try again.'
    );
    err.status = 409;
    err.statusText = err.message;
    err.data = {};
    throw err;
  }
};

/**
 * Drops the hold entry after Marketplace API accepted transaction initiation (no-op if expired).
 *
 * @param {boolean} options.isSuccessHttp
 */
exports.finalizePeakUpHoldAfterSuccessfulInitiate = ({
  isSpeculative,
  listing,
  peakupBookingHoldId,
}) => {
  if (isSpeculative) return;
  if (!listing?.attributes?.publicData?.peakupBookingListing || !peakupBookingHoldId) return;
  consumePeakupBookingHold(peakupBookingHoldId);
};
