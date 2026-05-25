const { evaluateBronzeProgress } = require('./ambassadorBronzeCriteria');
const { sendAmbassadorRewardsUnlockEmail } = require('./ambassadorRewardsUnlockEmail');
const { ACTIVITY_TYPES, logReferralActivity } = require('./referralActivityStore');
const { promotePendingRewardsForAmbassador } = require('./referralRewardsStore');

const truthy = value => value === true || value === 'true' || value === 1 || value === '1';

const TIER_COMMISSION_PERCENT = {
  bronze: 2,
  silver: 3,
  gold: 4,
  platinum: 5,
  diamond: 6,
};

/**
 * Check bronze criteria and unlock rewards on the ambassador profile when complete.
 *
 * @param {object} params
 * @param {object} params.trustedSdk
 * @param {object} params.currentUser
 * @param {object} params.metrics
 * @returns {Promise<{ unlocked: boolean, justUnlocked: boolean, bronzeProgress: object }>}
 */
const evaluateAndUnlockAmbassadorRewards = async ({ sdk, currentUser, metrics }) => {
  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const alreadyUnlocked = truthy(publicData.ambassadorRewardsUnlocked);
  const bronzeProgress = evaluateBronzeProgress(metrics);
  const ambassadorUserId = currentUser?.id?.uuid;

  if (alreadyUnlocked || !bronzeProgress.allComplete) {
    return {
      unlocked: alreadyUnlocked,
      justUnlocked: false,
      bronzeProgress,
    };
  }

  const unlockedAt = new Date().toISOString();
  const nextPublicData = {
    ...publicData,
    ambassadorRewardsUnlocked: true,
    ambassadorRewardsUnlockedAt: unlockedAt,
  };

  await sdk.currentUser.updateProfile({
    publicData: nextPublicData,
  });

  logReferralActivity({
    ambassadorUserId,
    type: ACTIVITY_TYPES.REWARDS_UNLOCKED,
    title: 'Bronze rewards unlocked',
    body: 'Your referral commission is now active.',
    meta: { tier: publicData.ambassadorTier || 'bronze' },
  });

  promotePendingRewardsForAmbassador(ambassadorUserId);

  sendAmbassadorRewardsUnlockEmail({
    to: currentUser.attributes?.email,
    coachName: currentUser.attributes?.profile?.displayName || 'Coach',
    tier: publicData.ambassadorTier || 'bronze',
    commissionPercent: `${TIER_COMMISSION_PERCENT.bronze}%`,
  });

  return {
    unlocked: true,
    justUnlocked: true,
    bronzeProgress,
    unlockedAt,
  };
};

module.exports = {
  TIER_COMMISSION_PERCENT,
  evaluateAndUnlockAmbassadorRewards,
};
