/**
 * Resolve default-booking process state on the server (no client ESM imports).
 * Multi-Day Experience event cancellation uses coachEventCancellation.js (Integration API).
 */

const LAST_TRANSITION_TO_STATE = {
  'transition/inquire': 'inquiry',
  'transition/request-payment': 'pending-payment',
  'transition/request-payment-after-inquiry': 'pending-payment',
  'transition/confirm-payment': 'preauthorized',
  'transition/expire-payment': 'payment-expired',
  'transition/decline': 'declined',
  'transition/expire': 'expired',
  'transition/accept': 'accepted',
  'transition/operator-accept': 'accepted',
  'transition/provider-cancel': 'canceled',
  'transition/provider-cancel-from-delivered': 'canceled',
  'transition/complete': 'delivered',
  'transition/operator-complete': 'delivered',
};

/**
 * Provider-side transitions for coach calendar block cancellation.
 * Keys must match transaction.attributes.lastTransition on the live booking.
 */
const CANCEL_TRANSITION_BY_LAST_TRANSITION = {
  'transition/confirm-payment': 'transition/decline',
  'transition/accept': 'transition/provider-cancel',
  'transition/operator-accept': 'transition/provider-cancel',
  'transition/complete': 'transition/provider-cancel-from-delivered',
  'transition/operator-complete': 'transition/provider-cancel-from-delivered',
};

const PROVIDER_CANCEL_TRANSITION_NAMES = new Set([
  'transition/provider-cancel',
  'transition/provider-cancel-from-delivered',
]);

const LEGACY_BOOKING_CANCEL_MESSAGE =
  'This booking was created before the latest cancellation process update. Please test with a new booking after checkout is fixed.';

const isDefaultBookingProcess = transaction => {
  const rawName = transaction?.attributes?.processName || '';
  const baseName = rawName.includes('/') ? rawName.split('/')[0] : rawName;
  return baseName === 'default-booking';
};

/**
 * @param {Object} transaction API transaction entity
 * @returns {{ processState: string, processName: string }|null}
 */
const getBookingProcessStateInfo = transaction => {
  if (!isDefaultBookingProcess(transaction)) {
    return null;
  }

  const lastTransition = transaction?.attributes?.lastTransition;
  const processState = LAST_TRANSITION_TO_STATE[lastTransition] || null;
  if (!processState) {
    return null;
  }

  return { processState, processName: 'default-booking' };
};

/**
 * Pick the provider transition to run for coach block cancellation.
 *
 * @param {Object} transaction API transaction entity
 * @returns {{ transition: string|null, actor: string|null, processState: string|null, error: string|null }}
 */
const resolveCoachBlockCancelTransition = transaction => {
  const lastTransition = transaction?.attributes?.lastTransition || null;

  if (!isDefaultBookingProcess(transaction)) {
    return {
      transition: null,
      actor: null,
      processState: null,
      error: 'Unsupported transaction process for coach block cancellation',
    };
  }

  const info = getBookingProcessStateInfo(transaction);
  const processState = info?.processState || null;
  const transition = CANCEL_TRANSITION_BY_LAST_TRANSITION[lastTransition] || null;

  if (!transition) {
    return {
      transition: null,
      actor: null,
      processState,
      error: `No provider cancel transition for lastTransition=${lastTransition || 'unknown'}`,
    };
  }

  return {
    transition,
    actor: 'provider',
    processState,
    error: null,
  };
};

const findIncludedListing = (showResponse, transaction) => {
  const listingId = transaction?.relationships?.listing?.data?.id;
  return (showResponse?.data?.included || []).find(
    entity => entity.type === 'listing' && entity.id?.uuid === listingId?.uuid
  );
};

/**
 * Inspect process metadata from transaction.show (listing included).
 *
 * @param {Object} showResponse
 * @param {Object} transaction
 * @returns {Object}
 */
const getTransactionProcessDetails = (showResponse, transaction) => {
  const listing = findIncludedListing(showResponse, transaction);
  const info = getBookingProcessStateInfo(transaction);

  return {
    processName: transaction?.attributes?.processName || null,
    processAlias: listing?.attributes?.publicData?.transactionProcessAlias || null,
    processVersion: transaction?.attributes?.processVersion ?? null,
    lastTransition: transaction?.attributes?.lastTransition || null,
    transactionState: transaction?.attributes?.state || null,
    processState: info?.processState || null,
  };
};

/**
 * True when this transaction's pinned process version does not expose provider-cancel.
 *
 * @param {string|null} transition
 * @param {string[]} availableTransitions
 * @returns {boolean}
 */
const isLegacyProcessWithoutProviderCancel = (transition, availableTransitions) => {
  if (!transition || !PROVIDER_CANCEL_TRANSITION_NAMES.has(transition)) {
    return false;
  }
  if (!availableTransitions.length) {
    return true;
  }
  return !availableTransitions.includes(transition);
};

module.exports = {
  getBookingProcessStateInfo,
  resolveCoachBlockCancelTransition,
  getTransactionProcessDetails,
  isLegacyProcessWithoutProviderCancel,
  CANCEL_TRANSITION_BY_LAST_TRANSITION,
  PROVIDER_CANCEL_TRANSITION_NAMES,
  LEGACY_BOOKING_CANCEL_MESSAGE,
};
