const { evaluateBronzeProgress } = require('./ambassadorBronzeCriteria');
const {
  applyFounderBronzeProgressOverride,
  resolveAmbassadorFounderOverride,
} = require('./ambassadorFounderOverride');
const { resolveAmbassadorRewardsUnlockedWithDevOverride } = require('./ambassadorDevBronzeOverride');
const { fetchAmbassadorMetrics } = require('./ambassadorMetrics');
const { evaluateAndUnlockAmbassadorRewards } = require('./ambassadorTierEngine');
const {
  filterValidActivityForAggregates,
  filterValidRewardsForAggregates,
} = require('./referralAggregateUtils');
const { listActivityForAmbassador } = require('./referralActivityStore');
const {
  formatMinorAsCurrency,
  listRewardsForAmbassador,
  promotePendingRewardsForAmbassador,
  summarizeRewardsForAmbassador,
  toPublicRewardRecord,
} = require('./referralRewardsStore');
const { normalizeReferralCode } = require('./referralCodeNormalize');

const CRITERIA_LABEL_KEYS = {
  reviews: {
    labelId: 'ReferralCenterPage.progressReviews',
    targetId: 'ReferralCenterPage.progressReviewsTarget',
  },
  sessions: {
    labelId: 'ReferralCenterPage.progressSessions',
    targetId: 'ReferralCenterPage.progressSessionsTarget',
  },
  referrals: {
    labelId: 'ReferralCenterPage.progressReferrals',
    targetId: 'ReferralCenterPage.progressReferralsTarget',
  },
  response: {
    labelId: 'ReferralCenterPage.progressResponse',
    targetId: 'ReferralCenterPage.progressResponseTarget',
  },
  cancellations: {
    labelId: 'ReferralCenterPage.progressCancellations',
    targetId: 'ReferralCenterPage.progressCancellationsTarget',
  },
  profile: {
    labelId: 'ReferralCenterPage.progressProfile',
    targetId: 'ReferralCenterPage.progressProfileTarget',
  },
};

const mapBronzeCriteriaForClient = bronzeProgress =>
  bronzeProgress.criteria.map(item => ({
    id: item.id,
    labelId: CRITERIA_LABEL_KEYS[item.id]?.labelId,
    targetId: CRITERIA_LABEL_KEYS[item.id]?.targetId,
    progress: item.progress,
    completed: item.completed,
    current: item.current,
    target: item.target,
  }));

/**
 * Build live Referral Center dashboard payload for an active ambassador.
 *
 * @param {object} params
 * @param {object} params.trustedSdk
 * @param {object} params.currentUser
 */
const buildReferralCenterDashboard = async ({ sdk, trustedSdk, currentUser }) => {
  const ambassadorUserId = currentUser?.id?.uuid;
  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const ambassadorEmail = currentUser?.attributes?.email || '';
  const ambassadorReferralCode = publicData.ambassadorReferralCode
    ? normalizeReferralCode(publicData.ambassadorReferralCode)
    : null;

  const founderOverride = resolveAmbassadorFounderOverride({
    publicData,
    userId: ambassadorUserId,
  });

  const metrics = await fetchAmbassadorMetrics({
    trustedSdk,
    currentUser,
    ambassadorUserId,
  });

  const unlockResult = founderOverride.overrideActive
    ? { unlocked: true, justUnlocked: false, bronzeProgress: evaluateBronzeProgress(metrics) }
    : await evaluateAndUnlockAmbassadorRewards({
        sdk,
        currentUser,
        metrics,
      });

  const storedRewardsUnlocked =
    unlockResult.unlocked || Boolean(publicData.ambassadorRewardsUnlocked);
  const { unlocked: devBronzeUnlocked, overrideActive: devBronzeOverrideActive } =
    resolveAmbassadorRewardsUnlockedWithDevOverride({
      userId: ambassadorUserId,
      email: ambassadorEmail,
      referralCode: ambassadorReferralCode,
      storedUnlocked: storedRewardsUnlocked,
    });

  const ambassadorRewardsUnlocked = founderOverride.overrideActive
    ? true
    : devBronzeUnlocked;

  if ((founderOverride.overrideActive || devBronzeOverrideActive) && ambassadorUserId) {
    promotePendingRewardsForAmbassador(ambassadorUserId);
  }

  const bronzeProgress = founderOverride.overrideActive
    ? applyFounderBronzeProgressOverride(unlockResult.bronzeProgress || evaluateBronzeProgress(metrics))
    : unlockResult.bronzeProgress || evaluateBronzeProgress(metrics);
  const validReferralIds = new Set(metrics.validReferralIds || []);
  const validApplicationIds = new Set(metrics.validApplicationIds || []);
  const validRewards = filterValidRewardsForAggregates(
    listRewardsForAmbassador(ambassadorUserId),
    validReferralIds
  );
  const rewardsSummary = summarizeRewardsForAmbassador(ambassadorUserId, validRewards);
  const rewardHistory = validRewards.slice(0, 25).map(toPublicRewardRecord);
  const activity = filterValidActivityForAggregates(
    listActivityForAmbassador(ambassadorUserId, 12),
    validReferralIds,
    validApplicationIds
  );

  return {
    stats: {
      invited: metrics.stats.invited,
      pending: metrics.stats.pending,
      active: metrics.stats.active,
      rewards: formatMinorAsCurrency(rewardsSummary.earnedMinor, rewardsSummary.currency),
    },
    rewards: {
      lifetimeMinor: rewardsSummary.lifetimeMinor,
      pendingMinor: rewardsSummary.pendingMinor,
      monthlyMinor: rewardsSummary.monthlyMinor,
      earnedMinor: rewardsSummary.earnedMinor,
      currency: rewardsSummary.currency,
      earnedFormatted: formatMinorAsCurrency(rewardsSummary.earnedMinor, rewardsSummary.currency),
      lifetimeFormatted: formatMinorAsCurrency(
        rewardsSummary.lifetimeMinor,
        rewardsSummary.currency
      ),
      pendingFormatted: formatMinorAsCurrency(rewardsSummary.pendingMinor, rewardsSummary.currency),
      monthlyFormatted: formatMinorAsCurrency(rewardsSummary.monthlyMinor, rewardsSummary.currency),
    },
    rewardHistory,
    referrals: metrics.referrals,
    bronzeCriteria: mapBronzeCriteriaForClient(bronzeProgress),
    bronzeProgress: {
      completedCount: bronzeProgress.completedCount,
      totalCount: bronzeProgress.totalCount,
      allComplete: bronzeProgress.allComplete,
    },
    ambassadorRewardsUnlocked,
    ambassadorTier: founderOverride.overrideActive
      ? founderOverride.ambassadorTier
      : publicData.ambassadorTier || 'bronze',
    founderOverrideActive: founderOverride.overrideActive,
    founderCommissionPercent: founderOverride.commissionPercent,
    hideTierProgression: founderOverride.hideTierProgression,
    devBronzeOverrideActive,
    rewardsJustUnlocked: unlockResult.justUnlocked,
    rewardsUnlockedAt: publicData.ambassadorRewardsUnlockedAt || unlockResult.unlockedAt || null,
    activity,
  };
};

module.exports = {
  buildReferralCenterDashboard,
};
