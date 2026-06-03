/**
 * Resolve Sharetribe cancel transitions on the server (no client ESM imports).
 */

const LAST_TRANSITION_TO_BOOKING_STATE = {
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

const LAST_TRANSITION_TO_PURCHASE_STATE = {
  'transition/inquire': 'inquiry',
  'transition/request-payment': 'pending-payment',
  'transition/request-payment-after-inquiry': 'pending-payment',
  'transition/confirm-payment': 'purchased',
  'transition/expire-payment': 'payment-expired',
  'transition/mark-delivered': 'delivered',
  'transition/operator-mark-delivered': 'delivered',
  'transition/mark-received-from-purchased': 'received',
  'transition/mark-received': 'received',
  'transition/dispute': 'disputed',
  'transition/operator-dispute': 'disputed',
  'transition/cancel': 'canceled',
  'transition/auto-cancel': 'canceled',
  'transition/cancel-from-disputed': 'canceled',
  'transition/auto-cancel-from-disputed': 'canceled',
};

/**
 * Provider-side transitions for coach calendar block cancellation (default-booking).
 */
const BOOKING_CANCEL_TRANSITION_BY_LAST_TRANSITION = {
  'transition/confirm-payment': 'transition/decline',
  'transition/accept': 'transition/provider-cancel',
  'transition/operator-accept': 'transition/provider-cancel',
  'transition/complete': 'transition/provider-cancel-from-delivered',
  'transition/operator-complete': 'transition/provider-cancel-from-delivered',
};

/**
 * Operator-side transitions for multi-day event cancellation (default-purchase).
 * Refunds are handled by Sharetribe process actions (calculate-full-refund).
 */
const PURCHASE_CANCEL_TRANSITION_BY_LAST_TRANSITION = {
  'transition/confirm-payment': {
    transition: 'transition/cancel',
    actor: 'operator',
  },
  'transition/mark-delivered': {
    transition: 'transition/operator-dispute',
    actor: 'operator',
    chainedTransition: 'transition/cancel-from-disputed',
  },
  'transition/operator-mark-delivered': {
    transition: 'transition/operator-dispute',
    actor: 'operator',
    chainedTransition: 'transition/cancel-from-disputed',
  },
  'transition/dispute': {
    transition: 'transition/cancel-from-disputed',
    actor: 'operator',
  },
  'transition/operator-dispute': {
    transition: 'transition/cancel-from-disputed',
    actor: 'operator',
  },
};

const PROVIDER_CANCEL_TRANSITION_NAMES = new Set([
  'transition/provider-cancel',
  'transition/provider-cancel-from-delivered',
]);

const LEGACY_BOOKING_CANCEL_MESSAGE =
  'This booking was created before the latest cancellation process update. Please test with a new booking after checkout is fixed.';

const getProcessBaseName = transaction => {
  const rawName = transaction?.attributes?.processName || '';
  return rawName.includes('/') ? rawName.split('/')[0] : rawName;
};

const isDefaultBookingProcess = transaction => getProcessBaseName(transaction) === 'default-booking';

const isDefaultPurchaseProcess = transaction => getProcessBaseName(transaction) === 'default-purchase';

/**
 * @param {Object} transaction API transaction entity
 * @returns {{ processState: string, processName: string }|null}
 */
const getBookingProcessStateInfo = transaction => {
  if (!isDefaultBookingProcess(transaction)) {
    return null;
  }

  const lastTransition = transaction?.attributes?.lastTransition;
  const processState = LAST_TRANSITION_TO_BOOKING_STATE[lastTransition] || null;
  if (!processState) {
    return null;
  }

  return { processState, processName: 'default-booking' };
};

/**
 * @param {Object} transaction API transaction entity
 * @returns {{ processState: string, processName: string }|null}
 */
const getPurchaseProcessStateInfo = transaction => {
  if (!isDefaultPurchaseProcess(transaction)) {
    return null;
  }

  const lastTransition = transaction?.attributes?.lastTransition;
  const processState = LAST_TRANSITION_TO_PURCHASE_STATE[lastTransition] || null;
  if (!processState) {
    return null;
  }

  return { processState, processName: 'default-purchase' };
};

const getProcessStateInfo = transaction =>
  getBookingProcessStateInfo(transaction) || getPurchaseProcessStateInfo(transaction);

/**
 * Pick the provider transition to run for coach block cancellation (default-booking).
 *
 * @param {Object} transaction API transaction entity
 * @returns {{ transition: string|null, actor: string|null, chainedTransition: string|null, processState: string|null, error: string|null }}
 */
const resolveBookingCancelTransition = transaction => {
  const lastTransition = transaction?.attributes?.lastTransition || null;
  const info = getBookingProcessStateInfo(transaction);
  const processState = info?.processState || null;
  const transition = BOOKING_CANCEL_TRANSITION_BY_LAST_TRANSITION[lastTransition] || null;

  if (!transition) {
    return {
      transition: null,
      actor: null,
      chainedTransition: null,
      processState,
      error: `No provider cancel transition for lastTransition=${lastTransition || 'unknown'}`,
    };
  }

  return {
    transition,
    actor: 'provider',
    chainedTransition: null,
    processState,
    error: null,
  };
};

/**
 * Pick operator transition(s) for multi-day event cancellation (default-purchase).
 *
 * @param {Object} transaction API transaction entity
 * @returns {{ transition: string|null, actor: string|null, chainedTransition: string|null, processState: string|null, error: string|null }}
 */
const resolvePurchaseCancelTransition = transaction => {
  const lastTransition = transaction?.attributes?.lastTransition || null;
  const info = getPurchaseProcessStateInfo(transaction);
  const processState = info?.processState || null;
  const mapping = PURCHASE_CANCEL_TRANSITION_BY_LAST_TRANSITION[lastTransition] || null;

  if (!mapping) {
    return {
      transition: null,
      actor: null,
      chainedTransition: null,
      processState,
      error: `No operator cancel transition for lastTransition=${lastTransition || 'unknown'}`,
    };
  }

  return {
    transition: mapping.transition,
    actor: mapping.actor,
    chainedTransition: mapping.chainedTransition || null,
    processState,
    error: null,
  };
};

/**
 * Pick the transition to run for coach-initiated cancellation.
 *
 * @param {Object} transaction API transaction entity
 * @returns {{ transition: string|null, actor: string|null, chainedTransition: string|null, processState: string|null, error: string|null }}
 */
const resolveCoachBlockCancelTransition = transaction => {
  if (isDefaultBookingProcess(transaction)) {
    return resolveBookingCancelTransition(transaction);
  }

  if (isDefaultPurchaseProcess(transaction)) {
    return resolvePurchaseCancelTransition(transaction);
  }

  return {
    transition: null,
    actor: null,
    chainedTransition: null,
    processState: null,
    error: 'Unsupported transaction process for coach cancellation',
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
  const info = getProcessStateInfo(transaction);

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

/**
 * True when the resolved transition is not available on this transaction's process version.
 *
 * @param {string|null} transition
 * @param {string[]} availableTransitions
 * @returns {boolean}
 */
const isTransitionUnavailable = (transition, availableTransitions) => {
  if (!transition || !availableTransitions.length) {
    return false;
  }
  return !availableTransitions.includes(transition);
};

module.exports = {
  getBookingProcessStateInfo,
  getPurchaseProcessStateInfo,
  getProcessStateInfo,
  resolveCoachBlockCancelTransition,
  resolveBookingCancelTransition,
  resolvePurchaseCancelTransition,
  getTransactionProcessDetails,
  isLegacyProcessWithoutProviderCancel,
  isTransitionUnavailable,
  BOOKING_CANCEL_TRANSITION_BY_LAST_TRANSITION,
  PURCHASE_CANCEL_TRANSITION_BY_LAST_TRANSITION,
  PROVIDER_CANCEL_TRANSITION_NAMES,
  LEGACY_BOOKING_CANCEL_MESSAGE,
};
