/**
 * Operator cancel transitions for Multi-Day Experience (default-purchase) events.
 * Coaches trigger these via Integration API — not provider SDK transitions.
 */

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

/** Process states where coach-side Cancel Event is allowed. */
const CANCELABLE_EVENT_PROCESS_STATES = new Set(['purchased', 'delivered', 'disputed']);

/**
 * Operator transitions keyed by lastTransition (default-purchase).
 * Refunds are handled by Sharetribe process actions on these transitions.
 */
const OPERATOR_EVENT_CANCEL_BY_LAST_TRANSITION = {
  'transition/confirm-payment': {
    transition: 'transition/cancel',
    chainedTransition: null,
    cancelCase: 'purchased',
  },
  'transition/mark-delivered': {
    transition: 'transition/operator-dispute',
    chainedTransition: 'transition/cancel-from-disputed',
    cancelCase: 'delivered',
  },
  'transition/operator-mark-delivered': {
    transition: 'transition/operator-dispute',
    chainedTransition: 'transition/cancel-from-disputed',
    cancelCase: 'delivered',
  },
  'transition/dispute': {
    transition: 'transition/cancel-from-disputed',
    chainedTransition: null,
    cancelCase: 'disputed',
  },
  'transition/operator-dispute': {
    transition: 'transition/cancel-from-disputed',
    chainedTransition: null,
    cancelCase: 'disputed',
  },
};

const getProcessBaseName = transaction => {
  const rawName = transaction?.attributes?.processName || '';
  return rawName.includes('/') ? rawName.split('/')[0] : rawName;
};

const isDefaultPurchaseProcess = transaction => getProcessBaseName(transaction) === 'default-purchase';

/**
 * @param {Object} transaction
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

/**
 * @param {Object} transaction
 * @returns {boolean}
 */
const isCancelableMultiDayEventTransaction = transaction => {
  const info = getPurchaseProcessStateInfo(transaction);
  return info ? CANCELABLE_EVENT_PROCESS_STATES.has(info.processState) : false;
};

/**
 * Resolve Integration API operator transition(s) for coach event cancellation.
 *
 * @param {Object} transaction
 * @returns {{
 *   transition: string|null,
 *   chainedTransition: string|null,
 *   processState: string|null,
 *   cancelCase: string|null,
 *   actor: 'operator',
 *   error: string|null,
 * }}
 */
const resolveCoachEventCancelTransition = transaction => {
  const lastTransition = transaction?.attributes?.lastTransition || null;

  if (!isDefaultPurchaseProcess(transaction)) {
    return {
      transition: null,
      chainedTransition: null,
      processState: null,
      cancelCase: null,
      actor: 'operator',
      error: 'Unsupported transaction process for event cancellation',
    };
  }

  const info = getPurchaseProcessStateInfo(transaction);
  const processState = info?.processState || null;

  if (!processState || !CANCELABLE_EVENT_PROCESS_STATES.has(processState)) {
    return {
      transition: null,
      chainedTransition: null,
      processState,
      cancelCase: null,
      actor: 'operator',
      error: `Event cannot be canceled from processState=${processState || 'unknown'}`,
    };
  }

  const mapping = OPERATOR_EVENT_CANCEL_BY_LAST_TRANSITION[lastTransition] || null;

  if (!mapping) {
    return {
      transition: null,
      chainedTransition: null,
      processState,
      cancelCase: null,
      actor: 'operator',
      error: `No operator cancel transition for lastTransition=${lastTransition || 'unknown'}`,
    };
  }

  return {
    transition: mapping.transition,
    chainedTransition: mapping.chainedTransition || null,
    processState,
    cancelCase: mapping.cancelCase,
    actor: 'operator',
    error: null,
  };
};

module.exports = {
  CANCELABLE_EVENT_PROCESS_STATES,
  OPERATOR_EVENT_CANCEL_BY_LAST_TRANSITION,
  getPurchaseProcessStateInfo,
  isDefaultPurchaseProcess,
  isCancelableMultiDayEventTransaction,
  resolveCoachEventCancelTransition,
};
