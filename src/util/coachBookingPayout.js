/**
 * Coach booking payout detection — aligned with `server/api-util/referralRewardAccrual.js`.
 * Keep in sync when payout transition rules change.
 */

import { isDashboardCanceledTransaction } from './peakupBookingDashboard';

/** Transitions that create provider payout (booking truly completed). */
export const PAYOUT_EARNED_TRANSITIONS = new Set([
  'transition/complete',
  'transition/operator-complete',
  'transition/mark-delivered',
  'transition/operator-mark-delivered',
  'transition/auto-complete',
  'transition/accept-deliverable',
  'transition/auto-accept-deliverable',
  'transition/operator-accept-deliverable',
]);

export const LATE_REWARD_ACCRUAL_TRIGGER_TRANSITIONS = new Set([
  'transition/expire-review-period',
  'transition/expire-provider-review-period',
  'transition/expire-customer-review-period',
  'transition/review-1-by-provider',
  'transition/review-2-by-provider',
  'transition/review-1-by-customer',
  'transition/review-2-by-customer',
]);

/**
 * @param {object|null|undefined} money
 * @returns {number}
 */
export const getMoneyAmountMinor = money => Math.abs(Number(money?.amount) || 0);

/**
 * @param {object|null|undefined} transaction
 * @returns {string[]}
 */
export const getTransactionTransitionNames = transaction => {
  const transitions = transaction?.attributes?.transitions || [];
  return transitions
    .map(entry => (typeof entry === 'string' ? entry : entry?.transition))
    .filter(name => typeof name === 'string' && name.trim());
};

/**
 * True when the booking has reached provider payout (complete / delivered).
 *
 * @param {object|null|undefined} transaction
 * @returns {boolean}
 */
export const transactionHasPayoutEarned = transaction => {
  const transitionNames = getTransactionTransitionNames(transaction);
  if (transitionNames.some(name => PAYOUT_EARNED_TRANSITIONS.has(name))) {
    return true;
  }

  const payoutMinor = getMoneyAmountMinor(transaction?.attributes?.payoutTotal);
  if (payoutMinor <= 0) {
    return false;
  }

  const lastTransition = transaction?.attributes?.lastTransition;
  if (lastTransition && PAYOUT_EARNED_TRANSITIONS.has(lastTransition)) {
    return true;
  }

  return Boolean(
    lastTransition && LATE_REWARD_ACCRUAL_TRIGGER_TRANSITIONS.has(lastTransition)
  );
};

/**
 * @param {object|null|undefined} transaction
 * @returns {string}
 */
export const getTransactionCurrency = transaction =>
  transaction?.attributes?.payoutTotal?.currency ||
  transaction?.attributes?.payinTotal?.currency ||
  'CHF';

/**
 * Provider net payout minor units when available.
 *
 * @param {object|null|undefined} transaction
 * @returns {number}
 */
export const getProviderPayoutMinor = transaction =>
  getMoneyAmountMinor(transaction?.attributes?.payoutTotal);

/**
 * Completed provider payout eligible for coach earnings (excludes canceled/refunded bookings).
 *
 * @param {object|null|undefined} transaction
 * @returns {boolean}
 */
export const isCoachEarningsCompletedTransaction = transaction => {
  if (!transaction) {
    return false;
  }

  if (isDashboardCanceledTransaction(transaction)) {
    return false;
  }

  return transactionHasPayoutEarned(transaction);
};
