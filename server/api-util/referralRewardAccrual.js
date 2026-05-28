const { resolveAmbassadorRewardsUnlockedWithDevOverride } = require('./ambassadorDevBronzeOverride');
const { resolveAmbassadorFounderOverride } = require('./ambassadorFounderOverride');
const { TIER_COMMISSION_PERCENT } = require('./ambassadorTierEngine');
const { ACTIVITY_TYPES, logReferralActivity } = require('./referralActivityStore');
const { findReferralForCoach, linkReferralToCoachUser } = require('./referralCoachLookup');
const {
  REWARD_STATUSES,
  calculateAmbassadorCommissionMinor,
  calculateNetPeakupRevenueMinor,
  findRewardByTransactionId,
  recordRewardAccrual,
} = require('./referralRewardsStore');
const { sendAmbassadorRewardEarnedEmail } = require('./ambassadorRewardEarnedEmail');

/** Transitions that mark a paid booking/session as completed. */
const REWARD_ACCRUAL_TRANSITIONS = new Set([
  'transition/complete',
  'transition/operator-complete',
  'transition/mark-delivered',
  'transition/operator-mark-delivered',
  'transition/auto-complete',
  'transition/accept-deliverable',
  'transition/auto-accept-deliverable',
  'transition/operator-accept-deliverable',
]);

const truthy = value => value === true || value === 'true' || value === 1 || value === '1';

const getMoneyAmountMinor = money => Math.abs(Number(money?.amount) || 0);

const estimateStripeFeeMinor = bookingAmountMinor => {
  const percent = Number(process.env.PEAKUP_STRIPE_FEE_PERCENT || 2.9);
  const fixedMinor = Number(process.env.PEAKUP_STRIPE_FEE_FIXED_MINOR || 30);
  const variable = Math.round((Number(bookingAmountMinor) || 0) * (percent / 100));
  return variable + fixedMinor;
};

const sumPlatformFeeMinor = lineItems => {
  return (lineItems || [])
    .filter(item => String(item.code || '').includes('commission'))
    .reduce((sum, item) => sum + Math.abs(getMoneyAmountMinor(item.lineTotal)), 0);
};

/**
 * Extract booking economics from a Sharetribe transaction entity.
 *
 * @param {object} transaction
 * @returns {object}
 */
const extractTransactionEconomics = transaction => {
  const attrs = transaction?.attributes || {};
  const lineItems = attrs.lineItems || [];
  const currency = attrs.payinTotal?.currency || attrs.payoutTotal?.currency || 'CHF';
  const bookingAmountMinor = getMoneyAmountMinor(attrs.payinTotal);
  const coachNetPayoutMinor = getMoneyAmountMinor(attrs.payoutTotal);
  const platformFeeMinor = sumPlatformFeeMinor(lineItems);
  const stripeFeeMinor = estimateStripeFeeMinor(bookingAmountMinor);
  const netPeakupRevenueMinor = calculateNetPeakupRevenueMinor({
    bookingAmountMinor,
    coachNetPayoutMinor,
    platformFeeMinor,
    stripeFeeMinor,
  });

  return {
    currency,
    bookingAmountMinor,
    coachNetPayoutMinor,
    platformFeeMinor,
    stripeFeeMinor,
    netPeakupRevenueMinor,
  };
};

const getProviderId = transaction => transaction?.relationships?.provider?.data?.id?.uuid || null;

const getTransactionId = transaction => transaction?.id?.uuid || null;

const getCustomerId = transaction => transaction?.relationships?.customer?.data?.id?.uuid || null;

const getTransactionProtectedData = transaction => transaction?.attributes?.protectedData || {};

const getTransactionMetadata = transaction => transaction?.attributes?.metadata || {};

const fetchUserProfile = async (trustedSdk, userId) => {
  if (!userId) {
    return null;
  }

  try {
    const response = await trustedSdk.users.show({ id: userId });
    return response?.data?.data || null;
  } catch (error) {
    console.warn('[referral-reward-accrual] users.show failed:', error.message);
    return null;
  }
};

/**
 * @param {object} payload
 */
const logReferralFlowCheck = payload => {
  // eslint-disable-next-line no-console
  console.log('[PeakUp REFERRAL FLOW CHECK]', {
    transactionId: payload.transactionId ?? null,
    lastTransition: payload.lastTransition ?? null,
    customerId: payload.customerId ?? null,
    providerId: payload.providerId ?? null,
    referrerId: payload.referrerId ?? null,
    providerReferralOwner: payload.providerReferralOwner ?? null,
    transactionProtectedData: payload.transactionProtectedData ?? null,
    transactionMetadata: payload.transactionMetadata ?? null,
    ambassadorTier: payload.ambassadorTier ?? null,
    percentage: payload.percentage ?? null,
    grossAmount: payload.grossAmount ?? null,
    peakupFee: payload.peakupFee ?? null,
    stripeFee: payload.stripeFee ?? null,
    netPeakupRevenue: payload.netPeakupRevenue ?? null,
    rewardAmount: payload.rewardAmount ?? null,
    rewardExists: payload.rewardExists ?? false,
    reason: payload.reason ?? null,
  });
};

const flowLogBase = (transaction, transitionName) => ({
  transactionId: getTransactionId(transaction),
  lastTransition: transitionName || transaction?.attributes?.lastTransition || null,
  customerId: getCustomerId(transaction),
  providerId: getProviderId(transaction),
  referrerId: null,
  providerReferralOwner: null,
  transactionProtectedData: null,
  transactionMetadata: null,
  ambassadorTier: null,
  percentage: null,
  grossAmount: null,
  peakupFee: null,
  stripeFee: null,
  netPeakupRevenue: null,
  rewardAmount: null,
  rewardExists: false,
  reason: null,
});

/**
 * Process ambassador reward accrual after a completed booking transition.
 *
 * @param {object} params
 * @param {object} params.trustedSdk
 * @param {string} params.transitionName
 * @param {object} params.transaction
 * @returns {Promise<object|null>}
 */
const processReferralRewardAccrual = async ({ trustedSdk, transitionName, transaction }) => {
  const base = flowLogBase(transaction, transitionName);

  if (!REWARD_ACCRUAL_TRANSITIONS.has(transitionName)) {
    logReferralFlowCheck({
      ...base,
      reason: 'transition_not_eligible',
    });
    return null;
  }

  const transactionId = getTransactionId(transaction);
  if (!transactionId) {
    logReferralFlowCheck({ ...base, reason: 'missing_transaction_id' });
    return null;
  }

  const existingReward = findRewardByTransactionId(transactionId);
  if (existingReward) {
    logReferralFlowCheck({
      ...base,
      rewardExists: true,
      rewardAmount: existingReward.amountMinor,
      reason: 'reward_already_recorded',
    });
    return null;
  }

  const providerId = getProviderId(transaction);
  if (!providerId) {
    logReferralFlowCheck({ ...base, reason: 'missing_provider_id' });
    return null;
  }

  const txProtectedData = getTransactionProtectedData(transaction);
  const txMetadata = getTransactionMetadata(transaction);
  const providerReferralOwner =
    txProtectedData?.peakupReferralOwnerId ||
    txProtectedData?.referralOwnerId ||
    txMetadata?.peakupReferralOwnerId ||
    null;

  const providerUser = await fetchUserProfile(trustedSdk, providerId);
  if (!providerUser) {
    logReferralFlowCheck({ ...base, reason: 'provider_profile_not_found' });
    return null;
  }

  const coachEmail = providerUser.attributes?.email || '';
  const coachName = providerUser.attributes?.profile?.displayName || 'Coach';

  let referral = null;
  if (providerReferralOwner) {
    // Fast-path: transaction already captured the provider referral owner.
    referral = { ambassadorUserId: providerReferralOwner, id: txProtectedData?.peakupReferralId };
  } else {
    referral = findReferralForCoach({ coachUserId: providerId, coachEmail });
  }
  if (!referral) {
    logReferralFlowCheck({
      ...base,
      providerReferralOwner,
      transactionProtectedData: txProtectedData,
      transactionMetadata: txMetadata,
      reason: 'no_referral_ledger_for_coach',
    });
    return null;
  }

  if (!providerReferralOwner) {
    referral = linkReferralToCoachUser(referral, { userId: providerId, email: coachEmail });
  }

  const ambassadorUserId = referral.ambassadorUserId;
  if (!ambassadorUserId || ambassadorUserId === providerId) {
    logReferralFlowCheck({
      ...base,
      referrerId: ambassadorUserId,
      providerReferralOwner,
      transactionProtectedData: txProtectedData,
      transactionMetadata: txMetadata,
      reason: 'missing_or_self_referrer',
    });
    return null;
  }

  const ambassadorUser = await fetchUserProfile(trustedSdk, ambassadorUserId);
  const ambassadorPublicData = ambassadorUser?.attributes?.profile?.publicData || {};

  if (!truthy(ambassadorPublicData.ambassadorActive)) {
    logReferralFlowCheck({
      ...base,
      referrerId: ambassadorUserId,
      providerReferralOwner,
      transactionProtectedData: txProtectedData,
      transactionMetadata: txMetadata,
      reason: 'ambassador_not_active',
    });
    return null;
  }

  const founderOverride = resolveAmbassadorFounderOverride({
    publicData: ambassadorPublicData,
    userId: ambassadorUserId,
  });
  const tier = founderOverride.overrideActive
    ? founderOverride.ambassadorTier
    : String(ambassadorPublicData.ambassadorTier || 'bronze').toLowerCase();
  const ambassadorPercent = founderOverride.overrideActive
    ? founderOverride.commissionPercent
    : TIER_COMMISSION_PERCENT[tier] || TIER_COMMISSION_PERCENT.bronze;
  const rewardsUnlocked = founderOverride.overrideActive
    ? true
    : resolveAmbassadorRewardsUnlockedWithDevOverride({
        userId: ambassadorUserId,
        email: ambassadorUser?.attributes?.email,
        referralCode: ambassadorPublicData.ambassadorReferralCode,
        storedUnlocked: truthy(ambassadorPublicData.ambassadorRewardsUnlocked),
      }).unlocked;

  const economics = extractTransactionEconomics(transaction);
  const flowEconomics = {
    grossAmount: economics.bookingAmountMinor,
    peakupFee: economics.platformFeeMinor,
    stripeFee: economics.stripeFeeMinor,
    netPeakupRevenue: economics.netPeakupRevenueMinor,
  };

  if (economics.netPeakupRevenueMinor <= 0) {
    logReferralFlowCheck({
      ...base,
      referrerId: ambassadorUserId,
      providerReferralOwner,
      transactionProtectedData: txProtectedData,
      transactionMetadata: txMetadata,
      ambassadorTier: tier,
      percentage: ambassadorPercent,
      ...flowEconomics,
      reason: 'net_peakup_revenue_zero',
    });
    return null;
  }

  const ambassadorRewardMinor = calculateAmbassadorCommissionMinor(
    economics.netPeakupRevenueMinor,
    ambassadorPercent
  );

  if (ambassadorRewardMinor <= 0) {
    logReferralFlowCheck({
      ...base,
      referrerId: ambassadorUserId,
      providerReferralOwner,
      transactionProtectedData: txProtectedData,
      transactionMetadata: txMetadata,
      ambassadorTier: tier,
      percentage: ambassadorPercent,
      ...flowEconomics,
      reason: 'reward_amount_zero',
    });
    return null;
  }

  const record = recordRewardAccrual({
    ambassadorUserId,
    referralId: referral.id,
    transactionId,
    referredCoachUserId: providerId,
    referredCoachName: coachName,
    referredCoachEmail: coachEmail,
    bookingAmountMinor: economics.bookingAmountMinor,
    stripeFeeMinor: economics.stripeFeeMinor,
    platformFeeMinor: economics.platformFeeMinor,
    netPeakupRevenueMinor: economics.netPeakupRevenueMinor,
    coachNetPayoutMinor: economics.coachNetPayoutMinor,
    ambassadorPercent,
    amountMinor: ambassadorRewardMinor,
    currency: economics.currency,
    status: rewardsUnlocked ? REWARD_STATUSES.EARNED : REWARD_STATUSES.PENDING,
    note: rewardsUnlocked ? 'Booking completed' : 'Pending Bronze reward unlock',
  });

  const isFirstBooking = !referral.firstBookingRewardAt;
  if (isFirstBooking) {
    updateReferralEntrySafe(referral.id, {
      firstBookingRewardAt: record.createdAt,
      rewardStatus: 'earning',
    });
  }

  logReferralActivity({
    ambassadorUserId,
    type: isFirstBooking ? ACTIVITY_TYPES.FIRST_BOOKING : ACTIVITY_TYPES.REWARD_EARNED,
    title: isFirstBooking ? 'First booking completed' : 'Reward earned',
    body: `${coachName} completed a booking — ${(ambassadorRewardMinor / 100).toFixed(2)} ${economics.currency} ambassador reward.`,
    meta: {
      transactionId,
      rewardId: record.id,
      referralId: referral.id,
      amountMinor: ambassadorRewardMinor,
    },
  });

  if (rewardsUnlocked) {
    sendAmbassadorRewardEarnedEmail({
      to: ambassadorUser.attributes?.email,
      coachName: ambassadorUser.attributes?.profile?.displayName || 'Ambassador',
      referredCoachName: coachName,
      rewardFormatted: `${(ambassadorRewardMinor / 100).toFixed(2)} ${economics.currency}`,
      ambassadorPercent,
    });
  }

  logReferralFlowCheck({
    ...base,
    referrerId: ambassadorUserId,
    providerReferralOwner,
    transactionProtectedData: txProtectedData,
    transactionMetadata: txMetadata,
    ambassadorTier: tier,
    percentage: ambassadorPercent,
    ...flowEconomics,
    rewardAmount: ambassadorRewardMinor,
    rewardExists: true,
    reason: rewardsUnlocked ? 'reward_recorded_earned' : 'reward_recorded_pending',
  });

  console.info(
    `[referral-reward-accrual] Recorded ${record.id} for ambassador ${ambassadorUserId} on tx ${transactionId}`
  );

  return record;
};

const updateReferralEntrySafe = (id, patch) => {
  try {
    const { updateReferralEntry } = require('./referralLedgerStore');
    updateReferralEntry(id, patch);
  } catch (error) {
    console.warn('[referral-reward-accrual] referral update failed:', error.message);
  }
};

module.exports = {
  REWARD_ACCRUAL_TRANSITIONS,
  extractTransactionEconomics,
  logReferralFlowCheck,
  processReferralRewardAccrual,
};
