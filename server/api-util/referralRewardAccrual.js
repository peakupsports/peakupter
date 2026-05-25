const { TIER_COMMISSION_PERCENT } = require('./ambassadorTierEngine');
const { ACTIVITY_TYPES, logReferralActivity } = require('./referralActivityStore');
const { findReferralForCoach, linkReferralToCoachUser } = require('./referralCoachLookup');
const {
  REWARD_STATUSES,
  calculateAmbassadorCommissionMinor,
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

  return {
    currency,
    bookingAmountMinor,
    coachNetPayoutMinor,
    platformFeeMinor,
    stripeFeeMinor,
  };
};

const getProviderId = transaction => transaction?.relationships?.provider?.data?.id?.uuid || null;

const getTransactionId = transaction => transaction?.id?.uuid || null;

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
 * Process ambassador reward accrual after a completed booking transition.
 *
 * @param {object} params
 * @param {object} params.trustedSdk
 * @param {string} params.transitionName
 * @param {object} params.transaction
 * @returns {Promise<object|null>}
 */
const processReferralRewardAccrual = async ({ trustedSdk, transitionName, transaction }) => {
  if (!REWARD_ACCRUAL_TRANSITIONS.has(transitionName)) {
    return null;
  }

  const transactionId = getTransactionId(transaction);
  if (!transactionId) {
    return null;
  }

  if (findRewardByTransactionId(transactionId)) {
    return null;
  }

  const providerId = getProviderId(transaction);
  if (!providerId) {
    return null;
  }

  const providerUser = await fetchUserProfile(trustedSdk, providerId);
  if (!providerUser) {
    return null;
  }

  const coachEmail = providerUser.attributes?.email || '';
  const coachName = providerUser.attributes?.profile?.displayName || 'Coach';

  let referral = findReferralForCoach({ coachUserId: providerId, coachEmail });
  if (!referral) {
    return null;
  }

  referral = linkReferralToCoachUser(referral, { userId: providerId, email: coachEmail });

  const ambassadorUserId = referral.ambassadorUserId;
  if (!ambassadorUserId || ambassadorUserId === providerId) {
    return null;
  }

  const ambassadorUser = await fetchUserProfile(trustedSdk, ambassadorUserId);
  const ambassadorPublicData = ambassadorUser?.attributes?.profile?.publicData || {};

  if (!truthy(ambassadorPublicData.ambassadorActive)) {
    return null;
  }

  const tier = String(ambassadorPublicData.ambassadorTier || 'bronze').toLowerCase();
  const ambassadorPercent = TIER_COMMISSION_PERCENT[tier] || TIER_COMMISSION_PERCENT.bronze;
  const rewardsUnlocked = truthy(ambassadorPublicData.ambassadorRewardsUnlocked);

  const economics = extractTransactionEconomics(transaction);
  if (economics.coachNetPayoutMinor <= 0) {
    return null;
  }

  const ambassadorRewardMinor = calculateAmbassadorCommissionMinor(
    economics.coachNetPayoutMinor,
    ambassadorPercent
  );

  if (ambassadorRewardMinor <= 0) {
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
  processReferralRewardAccrual,
};
