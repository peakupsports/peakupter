/**
 * Coach earnings dashboard snapshot helpers.
 */

import { getTransactionCopyProcessName } from '../../util/peakUpMultiDayPurchase';
import { filterDashboardOperationalTransactions, isDashboardCanceledTransaction } from '../../util/peakupBookingDashboard';
import { getBookingProcessStateInfo } from '../../util/peakupBookingRequestPopup';
import {
  getMoneyAmountMinor,
  getProviderPayoutMinor,
  getTransactionCurrency,
  isCoachEarningsCompletedTransaction,
} from '../../util/coachBookingPayout';

/** @typedef {Object} CoachEarningsOverview
 * @property {number} thisMonthMinor
 * @property {number} pendingPayoutMinor
 * @property {number} completedBookings
 * @property {number} lifetimeEarningsMinor
 * @property {string} currency
 */

/** @typedef {Object} CoachEarningsAmbassadorSnapshot
 * @property {number} referralEarningsMinor
 * @property {number} referralsCount
 */

/** @typedef {Object} CoachEarningsDashboardSnapshot
 * @property {CoachEarningsOverview} overview
 * @property {Array<Object>} transactions
 * @property {CoachEarningsAmbassadorSnapshot} ambassador
 */

/** Referral counts required to reach the next ambassador tier (placeholder until API). */
export const AMBASSADOR_NEXT_TIER_REFERRAL_REQUIREMENTS = {
  bronze: { nextTier: 'silver', requiredReferrals: 10 },
  silver: { nextTier: 'gold', requiredReferrals: 15 },
  gold: { nextTier: 'platinum', requiredReferrals: 25 },
  platinum: { nextTier: 'diamond', requiredReferrals: 50 },
};

/**
 * Placeholder tier progress for the earnings dashboard ambassador block.
 *
 * @param {string} [tierId]
 * @param {number} [referralsCount]
 * @returns {{
 *   nextTier: string,
 *   requiredReferrals: number,
 *   currentReferrals: number,
 *   progressPercent: number,
 * }|null}
 */
export const getAmbassadorTierProgress = (tierId, referralsCount = 0) => {
  const tier = String(tierId || 'bronze').trim().toLowerCase();
  const config = AMBASSADOR_NEXT_TIER_REFERRAL_REQUIREMENTS[tier];
  if (!config) {
    return null;
  }

  const currentReferrals = Math.max(0, Number(referralsCount) || 0);
  const requiredReferrals = config.requiredReferrals;
  const progressPercent =
    requiredReferrals > 0
      ? Math.min(100, Math.round((currentReferrals / requiredReferrals) * 100))
      : 0;

  return {
    nextTier: config.nextTier,
    requiredReferrals,
    currentReferrals,
    progressPercent,
  };
};

/** @type {CoachEarningsDashboardSnapshot} */
export const PLACEHOLDER_EARNINGS_DASHBOARD = {
  overview: {
    thisMonthMinor: 0,
    pendingPayoutMinor: 0,
    completedBookings: 0,
    lifetimeEarningsMinor: 0,
    currency: 'CHF',
  },
  transactions: [],
  ambassador: {
    referralEarningsMinor: 0,
    referralsCount: 0,
  },
};

/**
 * @param {CoachEarningsDashboardSnapshot} [snapshot]
 * @returns {CoachEarningsDashboardSnapshot}
 */
export const getCoachEarningsDashboardSnapshot = (snapshot = PLACEHOLDER_EARNINGS_DASHBOARD) => ({
  overview: { ...PLACEHOLDER_EARNINGS_DASHBOARD.overview, ...snapshot?.overview },
  transactions: Array.isArray(snapshot?.transactions) ? snapshot.transactions : [],
  ambassador: { ...PLACEHOLDER_EARNINGS_DASHBOARD.ambassador, ...snapshot?.ambassador },
});

const isPaymentCapturedTransaction = transaction => {
  if (isDashboardCanceledTransaction(transaction)) {
    return false;
  }
  if (getMoneyAmountMinor(transaction?.attributes?.payinTotal) > 0) {
    return true;
  }
  const state = String(getBookingProcessStateInfo(transaction)?.processState || '').toLowerCase();
  return (
    state.includes('preauthorized') ||
    state.includes('accepted') ||
    state.includes('delivered') ||
    state.includes('purchased') ||
    state.includes('completed') ||
    state.includes('review')
  );
};

const getPayoutEarnedAtMs = transaction => {
  if (!isCoachEarningsCompletedTransaction(transaction)) {
    return null;
  }
  return new Date(transaction?.attributes?.lastTransitionedAt || 0).getTime();
};

const getCustomerDisplayName = transaction =>
  transaction?.customer?.attributes?.profile?.displayName ||
  transaction?.customer?.attributes?.profile?.abbreviatedName ||
  null;

const getTransactionSortMs = transaction =>
  new Date(
    transaction?.attributes?.lastTransitionedAt ||
      transaction?.booking?.attributes?.start ||
      0
  ).getTime();

/**
 * Derive booking earnings overview + recent transactions from provider sales.
 *
 * @param {Array<Object>} salesTransactions denormalised Sharetribe sale transactions
 * @param {{ now?: Date, limit?: number }} [options]
 * @returns {{ overview: CoachEarningsOverview, transactions: Array<Object> }}
 */
export const deriveCoachEarningsFromSalesTransactions = (
  salesTransactions = [],
  { now = new Date(), limit = 12 } = {}
) => {
  const operational = filterDashboardOperationalTransactions(salesTransactions);
  const currency =
    operational.map(getTransactionCurrency).find(Boolean) ||
    PLACEHOLDER_EARNINGS_DASHBOARD.overview.currency;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let thisMonthMinor = 0;
  let pendingPayoutMinor = 0;
  let lifetimeEarningsMinor = 0;
  let completedBookings = 0;

  operational.forEach(transaction => {
    const payoutMinor = getProviderPayoutMinor(transaction);
    const payoutEarned = isCoachEarningsCompletedTransaction(transaction);

    if (payoutEarned) {
      completedBookings += 1;
      lifetimeEarningsMinor += payoutMinor;

      const earnedAtMs = getPayoutEarnedAtMs(transaction);
      if (earnedAtMs != null && earnedAtMs >= monthStart.getTime() && earnedAtMs <= monthEnd.getTime()) {
        thisMonthMinor += payoutMinor;
      }
      return;
    }

    if (isPaymentCapturedTransaction(transaction) && payoutMinor > 0) {
      pendingPayoutMinor += payoutMinor;
    }
  });

  const completedTransactions = operational.filter(isCoachEarningsCompletedTransaction);

  const transactions = [...completedTransactions]
    .sort((a, b) => getTransactionSortMs(b) - getTransactionSortMs(a))
    .slice(0, Math.max(0, limit))
    .map(transaction => {
      const info = getBookingProcessStateInfo(transaction);
      const processName = info?.processName || 'default-booking';
      const processState = info?.processState || '';
      const copyProcessName = getTransactionCopyProcessName(transaction, processName);
      const payoutMinor = getProviderPayoutMinor(transaction);

      return {
        id: transaction?.id?.uuid || null,
        dateIso:
          transaction?.attributes?.lastTransitionedAt ||
          transaction?.booking?.attributes?.start ||
          null,
        customerName: getCustomerDisplayName(transaction),
        listingTitle: transaction?.listing?.attributes?.title || null,
        amountMinor: payoutMinor,
        currency: getTransactionCurrency(transaction) || currency,
        processName: copyProcessName,
        processState,
      };
    });

  return {
    overview: {
      thisMonthMinor,
      pendingPayoutMinor,
      completedBookings,
      lifetimeEarningsMinor,
      currency,
    },
    transactions,
  };
};
