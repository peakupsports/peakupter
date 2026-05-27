const { listAllReferrals } = require('./referralLedgerStore');
const { findReferralForCoach } = require('./referralCoachLookup');
const { resolveReferredCoachUserId } = require('./referralCoachActiveListings');
const { repairAllReferralLedgerEntries } = require('./referralLedgerRepair');
const { findRewardByTransactionId } = require('./referralRewardsStore');
const {
  extractTransactionEconomics,
  processReferralRewardAccrual,
} = require('./referralRewardAccrual');

/** Completed booking states (aligned with ambassadorMetrics). */
const COMPLETED_BOOKING_STATES = [
  'delivered',
  'reviewed',
  'reviewed-by-customer',
  'reviewed-by-provider',
  'completed',
].join(',');

/** Backfill scans only Console-style completion transitions (see requirements). */
const BACKFILL_LAST_TRANSITIONS = ['transition/complete', 'transition/operator-complete'];

const BACKFILL_LAST_TRANSITIONS_QUERY = BACKFILL_LAST_TRANSITIONS.join(',');

const getTransactionId = transaction => transaction?.id?.uuid || null;

const getProviderId = transaction => transaction?.relationships?.provider?.data?.id?.uuid || null;

const getLastTransition = transaction => transaction?.attributes?.lastTransition || null;

const isBackfillEligibleLastTransition = lastTransition =>
  BACKFILL_LAST_TRANSITIONS.includes(lastTransition);

const buildEconomicsFields = transaction => {
  const economics = extractTransactionEconomics(transaction);
  return {
    grossAmount: economics.bookingAmountMinor,
    peakupFee: economics.platformFeeMinor,
    stripeFee: economics.stripeFeeMinor,
    netPeakupRevenue: economics.netPeakupRevenueMinor,
  };
};

/**
 * @param {object} payload
 */
const logReferralBackfillCheck = payload => {
  // eslint-disable-next-line no-console
  console.log('[PeakUp REFERRAL BACKFILL CHECK]', {
    transactionId: payload.transactionId ?? null,
    lastTransition: payload.lastTransition ?? null,
    providerId: payload.providerId ?? null,
    referrerId: payload.referrerId ?? null,
    isEligible: Boolean(payload.isEligible),
    alreadyRewarded: Boolean(payload.alreadyRewarded),
    rewardCreated: Boolean(payload.rewardCreated),
    grossAmount: payload.grossAmount ?? null,
    peakupFee: payload.peakupFee ?? null,
    stripeFee: payload.stripeFee ?? null,
    netPeakupRevenue: payload.netPeakupRevenue ?? null,
    reason: payload.reason ?? null,
  });
};

const resolveReferrerIdForProvider = providerId => {
  if (!providerId) {
    return null;
  }
  const referral = findReferralForCoach({ coachUserId: providerId });
  return referral?.ambassadorUserId || null;
};

const buildReferredCoachUserIdSet = () => {
  const ids = new Set();
  listAllReferrals().forEach(entry => {
    const coachUserId = resolveReferredCoachUserId(entry);
    if (coachUserId) {
      ids.add(coachUserId);
    }
  });
  return ids;
};

/**
 * Evaluate one transaction for backfill without mutating reward state.
 *
 * @param {object} transaction
 * @param {Set<string>} referredCoachIds
 * @returns {object}
 */
const evaluateBackfillTransaction = (transaction, referredCoachIds) => {
  const transactionId = getTransactionId(transaction);
  const lastTransition = getLastTransition(transaction);
  const providerId = getProviderId(transaction);
  const referrerId = resolveReferrerIdForProvider(providerId);
  const alreadyRewarded = Boolean(transactionId && findRewardByTransactionId(transactionId));

  const check = {
    transactionId,
    lastTransition,
    providerId,
    referrerId,
    isEligible: false,
    alreadyRewarded,
    rewardCreated: false,
    rewardId: null,
    reason: null,
    ...buildEconomicsFields(transaction),
  };

  if (!isBackfillEligibleLastTransition(lastTransition)) {
    check.reason = 'last_transition_not_eligible';
    return check;
  }

  if (!providerId || !referredCoachIds.has(providerId)) {
    check.reason = 'provider_not_referred_coach';
    return check;
  }

  if (!referrerId) {
    check.reason = 'no_referrer_on_ledger';
    return check;
  }

  if (alreadyRewarded) {
    check.reason = 'already_recorded';
    return check;
  }

  check.isEligible = true;
  check.reason = 'eligible_for_accrual';
  return check;
};

const recordBackfillCheck = (summary, check) => {
  summary.checks.push(check);
  logReferralBackfillCheck(check);
};

/**
 * @param {object} sdk Integration or trusted Marketplace SDK
 * @param {object} [options]
 * @param {string} [options.providerId] Limit to one referred coach (Sharetribe user uuid)
 * @param {string} [options.transactionId] Process a single transaction only
 * @param {boolean} [options.dryRun] Log only; do not call processReferralRewardAccrual
 * @param {number} [options.maxPages] Pagination cap (default 50)
 * @returns {Promise<Array>}
 */
const fetchCompletedTransactionsForBackfill = async (sdk, options = {}) => {
  const { providerId, transactionId, maxPages = 50 } = options;
  const transactions = [];

  if (transactionId) {
    const response = await sdk.transactions.show({
      id: transactionId,
      include: ['provider'],
      'fields.transaction': [
        'processName',
        'lastTransition',
        'lastTransitionedAt',
        'lineItems',
        'payinTotal',
        'payoutTotal',
      ],
    });
    const tx = response?.data?.data;
    if (tx) {
      transactions.push(tx);
    }
    return transactions;
  }

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    const query = {
      states: COMPLETED_BOOKING_STATES,
      lastTransitions: BACKFILL_LAST_TRANSITIONS_QUERY,
      page,
      perPage: 100,
      include: ['provider'],
      'fields.transaction': [
        'processName',
        'lastTransition',
        'lastTransitionedAt',
        'lineItems',
        'payinTotal',
        'payoutTotal',
      ],
    };

    if (providerId) {
      query.providerId = providerId;
    }

    // eslint-disable-next-line no-await-in-loop
    const response = await sdk.transactions.query(query);
    const batch = response?.data?.data || [];
    transactions.push(...batch);

    const meta = response?.data?.meta || {};
    totalPages = meta.totalPages || 1;
    page += 1;
  }

  return transactions;
};

/**
 * Scan completed referred-coach transactions and accrue missing ambassador rewards.
 *
 * @param {object} sdk Integration or trusted Marketplace SDK
 * @param {object} [options]
 * @returns {Promise<object>}
 */
const runReferralRewardBackfill = async (sdk, options = {}) => {
  const { providerId, transactionId, dryRun = false, maxPages = 50, skipLedgerRepair = false } =
    options;
  const ledgerRepair = skipLedgerRepair
    ? { scanned: 0, repaired: 0, results: [] }
    : {
        results: repairAllReferralLedgerEntries({ dryRun }),
      };
  ledgerRepair.repaired = ledgerRepair.results.filter(result => result.repaired).length;
  ledgerRepair.scanned = ledgerRepair.results.length;

  const referredCoachIds = buildReferredCoachUserIdSet();

  if (providerId && !referredCoachIds.has(providerId)) {
    return {
      ok: true,
      dryRun,
      ledgerRepair,
      scanned: 0,
      eligible: 0,
      alreadyRewarded: 0,
      rewardsCreated: 0,
      skipped: 0,
      checks: [],
      message: 'provider_not_in_referral_ledger',
    };
  }

  const transactions = await fetchCompletedTransactionsForBackfill(sdk, {
    providerId,
    transactionId,
    maxPages,
  });

  const summary = {
    ok: true,
    dryRun,
    ledgerRepair,
    scanned: transactions.length,
    eligible: 0,
    alreadyRewarded: 0,
    rewardsCreated: 0,
    skipped: 0,
    checks: [],
  };

  for (const transaction of transactions) {
    const check = evaluateBackfillTransaction(transaction, referredCoachIds);

    if (check.isEligible) {
      summary.eligible += 1;
    } else {
      summary.skipped += 1;
      if (check.alreadyRewarded) {
        summary.alreadyRewarded += 1;
      }
      recordBackfillCheck(summary, check);
      continue;
    }

    if (dryRun) {
      check.reason = 'dry_run_would_accrue';
      check.isEligible = true;
      summary.skipped += 1;
      recordBackfillCheck(summary, check);
      continue;
    }

    const record = await processReferralRewardAccrual({
      trustedSdk: sdk,
      transitionName: check.lastTransition,
      transaction,
    });

    if (record) {
      summary.rewardsCreated += 1;
      check.rewardCreated = true;
      check.rewardId = record.id;
      check.reason = 'reward_created';
    } else {
      summary.skipped += 1;
      summary.eligible -= 1;
      check.isEligible = false;
      check.reason = 'accrual_returned_null';
    }

    recordBackfillCheck(summary, check);
  }

  return summary;
};

module.exports = {
  BACKFILL_LAST_TRANSITIONS,
  COMPLETED_BOOKING_STATES,
  isBackfillEligibleLastTransition,
  evaluateBackfillTransaction,
  logReferralBackfillCheck,
  runReferralRewardBackfill,
};
